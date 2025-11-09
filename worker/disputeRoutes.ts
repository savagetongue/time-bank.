import { Hono } from "hono";
import { Env, AuthEnv } from './core-utils';
import { getDbPool } from './db';
import { z } from 'zod';
import { authMiddleware } from "./middleware";
import { PoolConnection } from "mysql2/promise";
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
        let connection: PoolConnection | null = null;
        try {
            const pool = getDbPool(c);
            connection = await pool.getConnection();
            await connection.beginTransaction();
            const [bookings]: any[] = await connection.execute(
                `SELECT b.status, r.member_id as requester_id, o.provider_id
                 FROM bookings b
                 JOIN requests r ON b.request_id = r.id
                 JOIN offers o ON r.offer_id = o.id
                 WHERE b.id = ?`,
                [bookingId]
            );
            if (bookings.length === 0) {
                await connection.rollback();
                return c.json({ success: false, error: 'Booking not found.' }, 404);
            }
            const booking = bookings[0];
            const isParticipant = booking.requester_id === disputerId || booking.provider_id === disputerId;
            if (!isParticipant) {
                await connection.rollback();
                return c.json({ success: false, error: 'You are not authorized to dispute this booking.' }, 403);
            }
            if (booking.status !== 'COMPLETED') {
                await connection.rollback();
                return c.json({ success: false, error: 'Only completed bookings can be disputed.' }, 409);
            }
            const [existingDisputes]: any[] = await connection.execute(
                'SELECT id FROM disputes WHERE booking_id = ?',
                [bookingId]
            );
            if (existingDisputes.length > 0) {
                await connection.rollback();
                return c.json({ success: false, error: 'A dispute has already been raised for this booking.' }, 409);
            }
            const [result]: any = await connection.execute(
                'INSERT INTO disputes (booking_id, reason) VALUES (?, ?)',
                [bookingId, reason]
            );
            await connection.execute('UPDATE bookings SET status = \'DISPUTED\' WHERE id = ?', [bookingId]);
            await connection.commit();
            if (result.insertId) {
                return c.json({ success: true, data: { disputeId: result.insertId } }, 201);
            } else {
                return c.json({ success: false, error: 'Failed to create dispute.' }, 500);
            }
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Create dispute error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        } finally {
            if (connection) connection.release();
        }
    });
    authedApp.get('/api/disputes', authMiddleware, async (c) => {
        try {
            const db = getDbPool(c);
            const [disputes] = await db.execute(`
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
        let connection: PoolConnection | null = null;
        try {
            const pool = getDbPool(c);
            connection = await pool.getConnection();
            await connection.beginTransaction();
            const [disputes]: any[] = await connection.execute(
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
                await connection.rollback();
                return c.json({ success: false, error: 'Dispute not found.' }, 404);
            }
            const dispute = disputes[0];
            if (dispute.status !== 'OPEN') {
                await connection.rollback();
                return c.json({ success: false, error: 'Dispute is already closed.' }, 409);
            }
            await connection.execute(
                'UPDATE disputes SET status = ?, resolved_by_admin_id = ?, resolution_notes = ? WHERE id = ?',
                [resolution, adminId, resolutionNotes, disputeId]
            );
            if (resolution === 'RESOLVED' && refundAmount && refundAmount > 0) {
                if (refundAmount > dispute.escrow_amount) {
                    await connection.rollback();
                    return c.json({ success: false, error: 'Refund amount cannot exceed escrowed amount.' }, 400);
                }
                await connection.execute('UPDATE escrow SET status = \'REFUNDED\' WHERE booking_id = ?', [dispute.booking_id]);
                await connection.execute('UPDATE bookings SET status = \'CANCELLED\' WHERE id = ?', [dispute.booking_id]);
                const [reqBalanceResult]: any[] = await connection.execute('SELECT balance_after FROM ledger WHERE member_id = ? ORDER BY created_at DESC, id DESC LIMIT 1', [dispute.requester_id]);
                const reqBalance = reqBalanceResult.length > 0 ? parseFloat(reqBalanceResult[0].balance_after) : 0;
                await connection.execute(
                    'INSERT INTO ledger (member_id, booking_id, amount, txn_type, balance_after, notes) VALUES (?, ?, ?, ?, ?, ?)',
                    [dispute.requester_id, dispute.booking_id, refundAmount, 'REFUND', reqBalance + refundAmount, `Refund for disputed booking #${dispute.booking_id}`]
                );
                const [provBalanceResult]: any[] = await connection.execute('SELECT balance_after FROM ledger WHERE member_id = ? ORDER BY created_at DESC, id DESC LIMIT 1', [dispute.provider_id]);
                const provBalance = provBalanceResult.length > 0 ? parseFloat(provBalanceResult[0].balance_after) : 0;
                await connection.execute(
                    'INSERT INTO ledger (member_id, booking_id, amount, txn_type, balance_after, notes) VALUES (?, ?, ?, ?, ?, ?)',
                    [dispute.provider_id, dispute.booking_id, -refundAmount, 'ADJUSTMENT', provBalance - refundAmount, `Adjustment for disputed booking #${dispute.booking_id}`]
                );
            } else {
                await connection.execute('UPDATE bookings SET status = \'COMPLETED\' WHERE id = ?', [dispute.booking_id]);
            }
            await connection.commit();
            return c.json({ success: true, data: { disputeId } });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Resolve dispute error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        } finally {
            if (connection) connection.release();
        }
    });
}