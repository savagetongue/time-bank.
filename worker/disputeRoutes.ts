import { Hono } from "hono";
import { Env, AuthEnv } from './core-utils';
import { query, transaction } from './db';
import { z } from 'zod';
import { authMiddleware } from "./middleware";

export function disputeRoutes(app: Hono<{ Bindings: Env }>) {
    const authedApp = app as unknown as Hono<AuthEnv>;
    const disputeSchema = z.object({
        bookingId: z.number().int().positive(),
        reason: z.string().min(10, "Reason must be at least 10 characters.").max(2000),
    });
    authedApp.post('/api/disputes', authMiddleware, async (c) => {
        const disputerId = c.get('userId');
        const body = await c.req.json();
        const validation = disputeSchema.safeParse(body);
        if (!validation.success) {
            return c.json({ success: false, error: 'Validation failed', details: validation.error.flatten() }, 400);
        }
        const { bookingId, reason } = validation.data;
        try {
            const result = await transaction(c, async (conn) => {
                const { rows: bookings } = await conn.execute(
                    `SELECT b.status, r.member_id as requester_id, o.provider_id
                     FROM bookings b
                     JOIN requests r ON b.request_id = r.id
                     JOIN offers o ON r.offer_id = o.id
                     WHERE b.id = ?`,
                    [bookingId]
                );
                if (bookings.length === 0) {
                    throw { error: 'Booking not found.', status: 404 };
                }
                const booking = bookings[0];
                const isParticipant = booking.requester_id === disputerId || booking.provider_id === disputerId;
                if (!isParticipant) {
                    throw { error: 'You are not authorized to dispute this booking.', status: 403 };
                }
                if (booking.status !== 'COMPLETED') {
                    throw { error: 'Only completed bookings can be disputed.', status: 409 };
                }
                const { rows: existingDisputes } = await conn.execute(
                    'SELECT id FROM disputes WHERE booking_id = ?',
                    [bookingId]
                );
                if (existingDisputes.length > 0) {
                    throw { error: 'A dispute has already been raised for this booking.', status: 409 };
                }
                const insertResult = await conn.execute(
                    'INSERT INTO disputes (booking_id, reason) VALUES (?, ?)',
                    [bookingId, reason]
                );
                await conn.execute('UPDATE bookings SET status = \'DISPUTED\' WHERE id = ?', [bookingId]);
                if (insertResult.insertId) {
                    return { disputeId: insertResult.insertId };
                } else {
                    throw new Error('Failed to create dispute.');
                }
            });
            return c.json({ success: true, data: result }, 201);
        } catch (error: any) {
            if (error.status) {
                return c.json({ success: false, error: error.error }, error.status);
            }
            console.error('Create dispute error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    authedApp.get('/api/disputes', authMiddleware, async (c) => {
        try {
            const { rows: disputes } = await query(c, `
                SELECT
                    d.id, d.booking_id, d.reason, d.status, d.created_at,
                    JSON_OBJECT('id', b.id, 'start_time', b.start_time) as booking,
                    JSON_OBJECT('id', m.id, 'name', m.name) as requester,
                    JSON_OBJECT('id', p.id, 'name', p.name) as provider
                FROM disputes d
                JOIN bookings b ON d.booking_id = b.id
                JOIN requests r ON b.request_id = r.id
                JOIN members m ON r.member_id = m.id
                JOIN offers o ON r.offer_id = o.id
                JOIN members p ON o.provider_id = p.id
                WHERE d.status = 'OPEN'
                ORDER BY d.created_at ASC
            `);
            return c.json({ success: true, data: disputes });
        } catch (error) {
            console.error('Get disputes error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    const resolveDisputeSchema = z.object({
        resolution: z.enum(['RESOLVED', 'REJECTED']),
        resolutionNotes: z.string().optional(),
        refundAmount: z.number().min(0).optional(),
    });
    authedApp.post('/api/disputes/:id/resolve', authMiddleware, async (c) => {
        const adminId = c.get('userId');
        const disputeId = parseInt(c.req.param('id'), 10);
        const body = await c.req.json();
        const validation = resolveDisputeSchema.safeParse(body);
        if (!validation.success) {
            return c.json({ success: false, error: 'Validation failed', details: validation.error.flatten() }, 400);
        }
        const { resolution, resolutionNotes, refundAmount } = validation.data;
        try {
            const result = await transaction(c, async (conn) => {
                const { rows: disputes } = await conn.execute(
                    `SELECT d.id, d.status, d.booking_id, e.amount as escrow_amount, r.member_id as requester_id, o.provider_id
                     FROM disputes d
                     JOIN bookings b ON d.booking_id = b.id
                     JOIN escrow e ON b.id = e.booking_id
                     JOIN requests r ON b.request_id = r.id
                     JOIN offers o ON r.offer_id = o.id
                     WHERE d.id = ?`,
                    [disputeId]
                );
                if (disputes.length === 0) {
                    throw { error: 'Dispute not found.', status: 404 };
                }
                const dispute = disputes[0];
                if (dispute.status !== 'OPEN') {
                    throw { error: 'Dispute is already closed.', status: 409 };
                }
                await conn.execute(
                    'UPDATE disputes SET status = ?, resolved_by_admin_id = ?, resolution_notes = ? WHERE id = ?',
                    [resolution, adminId, resolutionNotes, disputeId]
                );
                if (resolution === 'RESOLVED' && refundAmount && refundAmount > 0) {
                    if (refundAmount > dispute.escrow_amount) {
                        throw { error: 'Refund amount cannot exceed escrowed amount.', status: 400 };
                    }
                    await conn.execute('UPDATE escrow SET status = \'REFUNDED\' WHERE booking_id = ?', [dispute.booking_id]);
                    await conn.execute('UPDATE bookings SET status = \'CANCELLED\' WHERE id = ?', [dispute.booking_id]);
                    const { rows: reqBalanceResult } = await conn.execute('SELECT balance_after FROM ledger WHERE member_id = ? ORDER BY created_at DESC, id DESC LIMIT 1', [dispute.requester_id]);
                    const reqBalance = reqBalanceResult.length > 0 ? parseFloat(reqBalanceResult[0].balance_after) : 0;
                    await conn.execute(
                        'INSERT INTO ledger (member_id, booking_id, amount, txn_type, balance_after, notes) VALUES (?, ?, ?, ?, ?, ?)',
                        [dispute.requester_id, dispute.booking_id, refundAmount, 'REFUND', reqBalance + refundAmount, `Refund for disputed booking #${dispute.booking_id}`]
                    );
                    const { rows: provBalanceResult } = await conn.execute('SELECT balance_after FROM ledger WHERE member_id = ? ORDER BY created_at DESC, id DESC LIMIT 1', [dispute.provider_id]);
                    const provBalance = provBalanceResult.length > 0 ? parseFloat(provBalanceResult[0].balance_after) : 0;
                    await conn.execute(
                        'INSERT INTO ledger (member_id, booking_id, amount, txn_type, balance_after, notes) VALUES (?, ?, ?, ?, ?, ?)',
                        [dispute.provider_id, dispute.booking_id, -refundAmount, 'ADJUSTMENT', provBalance - refundAmount, `Adjustment for disputed booking #${dispute.booking_id}`]
                    );
                } else {
                    await conn.execute('UPDATE bookings SET status = \'COMPLETED\' WHERE id = ?', [dispute.booking_id]);
                }
                return { disputeId };
            });
            return c.json({ success: true, data: result });
        } catch (error: any) {
            if (error.status) {
                return c.json({ success: false, error: error.error }, error.status);
            }
            console.error('Resolve dispute error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
}