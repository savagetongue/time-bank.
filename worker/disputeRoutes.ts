import { Hono } from "hono";
import { Env, AuthEnv } from './core-utils';
import { getClient } from './db';
import { z } from 'zod';
import { authMiddleware } from "./middleware";
import { Pool } from "mysql2/promise";
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
            const db = getClient(c) as Pool;
            // 1. Verify the booking exists, is completed, and the user is part of it
            const [bookings]: any[] = await db.query(
                `SELECT b.status, r.member_id as requester_id, o.provider_id
                 FROM bookings b
                 JOIN requests r ON b.request_id = r.id
                 JOIN offers o ON r.offer_id = o.id
                 WHERE b.id = ?`,
                [bookingId]
            );
            if (bookings.length === 0) {
                return c.json({ success: false, error: 'Booking not found.' }, 404);
            }
            const booking = bookings[0];
            const isParticipant = booking.requester_id === disputerId || booking.provider_id === disputerId;
            if (!isParticipant) {
                return c.json({ success: false, error: 'You are not authorized to dispute this booking.' }, 403);
            }
            if (booking.status !== 'COMPLETED') {
                return c.json({ success: false, error: 'Only completed bookings can be disputed.' }, 409);
            }
            // 2. Check if a dispute already exists for this booking
            const [existingDisputes]: any[] = await db.query(
                'SELECT id FROM disputes WHERE booking_id = ?',
                [bookingId]
            );
            if (existingDisputes.length > 0) {
                return c.json({ success: false, error: 'A dispute has already been raised for this booking.' }, 409);
            }
            // 3. Create the dispute and update booking status
            const [result]: any = await db.query(
                'INSERT INTO disputes (booking_id, reason) VALUES (?, ?)',
                [bookingId, reason]
            );
            if (result.insertId) {
                await db.query('UPDATE bookings SET status = \'DISPUTED\' WHERE id = ?', [bookingId]);
                return c.json({ success: true, data: { disputeId: result.insertId } }, 201);
            } else {
                return c.json({ success: false, error: 'Failed to create dispute.' }, 500);
            }
        } catch (error) {
            console.error('Create dispute error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    // GET /api/disputes - Admin only
    authedApp.get('/api/disputes', authMiddleware, async (c) => {
        // In a real app, we'd have an admin role check here.
        // For now, any authenticated user can see this for testing.
        try {
            const db = getClient(c) as Pool;
            const [disputes] = await db.query(`
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
}