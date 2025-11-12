import { Hono } from "hono";
import { Env, AuthEnv } from './core-utils';
import { query, transaction } from './db';
import { z } from 'zod';
import { authMiddleware } from "./middleware";

export function bookingRoutes(app: Hono<{ Bindings: Env }>) {
    const authedApp = app as unknown as Hono<AuthEnv>;
    const bookingSchema = z.object({
        requestId: z.number().int().positive(),
        startTime: z.string().datetime(),
        durationMinutes: z.number().int().min(15),
    });
    authedApp.post('/api/bookings', authMiddleware, async (c) => {
        const providerId = c.get('userId');
        const body = await c.req.json();
        const validation = bookingSchema.safeParse(body);
        if (!validation.success) {
            return c.json({ success: false, error: 'Validation failed', details: validation.error.flatten() }, 400);
        }
        const { requestId, startTime, durationMinutes } = validation.data;
        try {
            const result = await transaction(c, async (tx) => {
                const { rows: requests } = await tx.execute(
                    `SELECT r.id, r.status, o.provider_id, o.rate_per_hour
                     FROM requests r
                     JOIN offers o ON r.offer_id = o.id
                     WHERE r.id = ?`,
                    [requestId]
                );
                if (requests.length === 0) {
                    throw { error: 'Request not found.', status: 404 };
                }
                const request = requests[0] as any;
                if (request.provider_id !== providerId) {
                    throw { error: 'You are not authorized to book this request.', status: 403 };
                }
                if (request.status !== 'OPEN') {
                    throw { error: 'This request has already been matched or cancelled.', status: 409 };
                }
                const bookingResult = await tx.execute(
                    'INSERT INTO bookings (request_id, start_time, duration_minutes) VALUES (?, ?, ?)',
                    [requestId, startTime, durationMinutes]
                );
                const bookingId = bookingResult.insertId;
                const escrowHeld = parseFloat(request.rate_per_hour) * (durationMinutes / 60);
                await tx.execute(
                    'INSERT INTO escrow (booking_id, amount) VALUES (?, ?)',
                    [bookingId, escrowHeld]
                );
                await tx.execute(
                    'UPDATE requests SET status = \'MATCHED\' WHERE id = ?',
                    [requestId]
                );
                return { data: { bookingId, escrowHeld } };
            });
            return c.json({ success: true, data: result.data }, 201);
        } catch (error: any) {
            if (error.status) {
                return c.json({ success: false, error: error.error }, error.status);
            }
            console.error('Create booking error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    authedApp.get('/api/bookings', authMiddleware, async (c) => {
        const userId = c.get('userId');
        try {
            const sql = `
                SELECT
                    b.*,
                    rt.id as rating_id,
                    d.id as dispute_id,
                    JSON_OBJECT('id', r.id, 'offer_id', r.offer_id, 'member_id', r.member_id, 'note', r.note, 'status', r.status, 'created_at', r.created_at) as request,
                    JSON_OBJECT('id', o.id, 'title', o.title, 'rate_per_hour', o.rate_per_hour) as offer,
                    JSON_OBJECT('id', p.id, 'name', p.name, 'email', p.email) as provider,
                    JSON_OBJECT('id', m.id, 'name', m.name, 'email', m.email) as member
                FROM bookings b
                JOIN requests r ON b.request_id = r.id
                JOIN offers o ON r.offer_id = o.id
                JOIN members p ON o.provider_id = p.id
                JOIN members m ON r.member_id = m.id
                LEFT JOIN ratings rt ON rt.booking_id = b.id AND rt.rater_id = ?
                LEFT JOIN disputes d ON d.booking_id = b.id
                WHERE o.provider_id = ? OR r.member_id = ?
                ORDER BY b.start_time DESC
            `;
            const { rows } = await query(c, sql, [userId, userId, userId]);
            return c.json({ success: true, data: rows });
        } catch (error) {
            console.error('Get bookings error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    authedApp.post('/api/bookings/:id/complete', authMiddleware, async (c) => {
        const providerId = c.get('userId');
        const bookingId = parseInt(c.req.param('id'), 10);
        if (isNaN(bookingId)) {
            return c.json({ success: false, error: 'Invalid booking ID.' }, 400);
        }
        try {
            const result = await transaction(c, async (tx) => {
                const { rows: bookings } = await tx.execute(
                    `SELECT
                        b.id, b.status,
                        r.member_id as requester_id,
                        o.provider_id,
                        e.amount, e.status as escrow_status
                     FROM bookings b
                     JOIN requests r ON b.request_id = r.id
                     JOIN offers o ON r.offer_id = o.id
                     JOIN escrow e ON b.id = e.booking_id
                     WHERE b.id = ?`,
                    [bookingId]
                );
                if (bookings.length === 0) {
                    throw { error: 'Booking not found.', status: 404 };
                }
                const booking = bookings[0] as any;
                if (booking.provider_id !== providerId) {
                    throw { error: 'You are not authorized to complete this booking.', status: 403 };
                }
                if (booking.status !== 'PENDING') {
                    throw { error: 'Booking is not in a completable state.', status: 409 };
                }
                await tx.execute('UPDATE bookings SET status = \'COMPLETED\' WHERE id = ?', [bookingId]);
                await tx.execute('UPDATE escrow SET status = \'RELEASED\' WHERE booking_id = ?', [bookingId]);
                const { rows: requesterBalanceResult } = await tx.execute('SELECT balance_after FROM ledger WHERE member_id = ? ORDER BY created_at DESC, id DESC LIMIT 1', [booking.requester_id]);
                const requesterBalance = requesterBalanceResult.length > 0 ? parseFloat((requesterBalanceResult[0] as any).balance_after) : 0;
                const newRequesterBalance = requesterBalance - parseFloat(booking.amount);
                await tx.execute(
                    'INSERT INTO ledger (member_id, booking_id, amount, txn_type, balance_after, notes) VALUES (?, ?, ?, ?, ?, ?)',
                    [booking.requester_id, bookingId, -booking.amount, 'DEBIT', newRequesterBalance, `Payment for booking #${bookingId}`]
                );
                const { rows: providerBalanceResult } = await tx.execute('SELECT balance_after FROM ledger WHERE member_id = ? ORDER BY created_at DESC, id DESC LIMIT 1', [providerId]);
                const providerBalance = providerBalanceResult.length > 0 ? parseFloat((providerBalanceResult[0] as any).balance_after) : 0;
                const newProviderBalance = providerBalance + parseFloat(booking.amount);
                await tx.execute(
                    'INSERT INTO ledger (member_id, booking_id, amount, txn_type, balance_after, notes) VALUES (?, ?, ?, ?, ?, ?)',
                    [providerId, bookingId, booking.amount, 'CREDIT', newProviderBalance, `Credit for booking #${bookingId}`]
                );
                return { data: { bookingId, escrowReleased: booking.amount } };
            });
            return c.json({ success: true, data: result.data });
        } catch (error: any) {
            if (error.status) {
                return c.json({ success: false, error: error.error }, error.status);
            }
            console.error('Complete booking error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
}