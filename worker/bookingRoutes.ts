import { Hono } from "hono";
import { Env, AuthEnv } from './core-utils';
import { getClient } from './db';
import { z } from 'zod';
import { authMiddleware } from "./middleware";
import { PoolConnection } from "mysql2/promise";
export function bookingRoutes(app: Hono<{ Bindings: Env }>) {
    const authedApp = app as Hono<AuthEnv>;
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
        let connection: PoolConnection | null = null;
        try {
            const pool = getClient(c);
            connection = await pool.getConnection();
            await connection.beginTransaction();
            // 1. Verify the request is valid and belongs to the provider
            const [requests]: any[] = await connection.query(
                `SELECT r.id, r.status, o.provider_id, o.rate_per_hour
                 FROM requests r
                 JOIN offers o ON r.offer_id = o.id
                 WHERE r.id = ?`,
                [requestId]
            );
            if (requests.length === 0) {
                await connection.rollback();
                return c.json({ success: false, error: 'Request not found.' }, 404);
            }
            const request = requests[0];
            if (request.provider_id !== providerId) {
                await connection.rollback();
                return c.json({ success: false, error: 'You are not authorized to book this request.' }, 403);
            }
            if (request.status !== 'OPEN') {
                await connection.rollback();
                return c.json({ success: false, error: 'This request has already been matched or cancelled.' }, 409);
            }
            // 2. Create the booking
            const [bookingResult]: any = await connection.query(
                'INSERT INTO bookings (request_id, start_time, duration_minutes) VALUES (?, ?, ?)',
                [requestId, startTime, durationMinutes]
            );
            const bookingId = bookingResult.insertId;
            // 3. Calculate and create the escrow
            const escrowHeld = parseFloat(request.rate_per_hour) * (durationMinutes / 60);
            await connection.query(
                'INSERT INTO escrow (booking_id, amount) VALUES (?, ?)',
                [bookingId, escrowHeld]
            );
            // 4. Update the request status
            await connection.query(
                'UPDATE requests SET status = \'MATCHED\' WHERE id = ?',
                [requestId]
            );
            await connection.commit();
            return c.json({ success: true, data: { bookingId, escrowHeld } }, 201);
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Create booking error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        } finally {
            if (connection) connection.release();
        }
    });
}