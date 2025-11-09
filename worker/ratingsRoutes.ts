import { Hono } from "hono";
import { Env, AuthEnv } from './core-utils';
import { getClient } from './db';
import { z } from 'zod';
import { authMiddleware } from "./middleware";
import { Pool } from "mysql2/promise";
export function ratingsRoutes(app: Hono<{ Bindings: Env }>) {
    const authedApp = app as unknown as Hono<AuthEnv>;
    const ratingSchema = z.object({
        bookingId: z.number().int().positive(),
        score: z.number().int().min(1).max(5),
        comments: z.string().max(1000).optional(),
    });
    authedApp.post('/api/ratings', authMiddleware, async (c) => {
        const raterId = c.get('userId');
        const body = await c.req.json();
        const validation = ratingSchema.safeParse(body);
        if (!validation.success) {
            return c.json({ success: false, error: 'Validation failed', details: validation.error.flatten() }, 400);
        }
        const { bookingId, score, comments } = validation.data;
        try {
            const db = getClient(c) as Pool;
            // 1. Verify the booking exists and the user is part of it
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
            const isRequester = booking.requester_id === raterId;
            const isProvider = booking.provider_id === raterId;
            if (!isRequester && !isProvider) {
                return c.json({ success: false, error: 'You are not authorized to rate this booking.' }, 403);
            }
            // 2. Check if booking is completed
            if (booking.status !== 'COMPLETED') {
                return c.json({ success: false, error: 'You can only rate completed bookings.' }, 409);
            }
            // 3. Check if user has already rated this booking
            const [existingRatings]: any[] = await db.query(
                'SELECT id FROM ratings WHERE booking_id = ? AND rater_id = ?',
                [bookingId, raterId]
            );
            if (existingRatings.length > 0) {
                return c.json({ success: false, error: 'You have already rated this booking.' }, 409);
            }
            const rateeId = isRequester ? booking.provider_id : booking.requester_id;
            // 4. Insert the rating
            const [result]: any = await db.query(
                'INSERT INTO ratings (booking_id, rater_id, ratee_id, score, comments) VALUES (?, ?, ?, ?, ?)',
                [bookingId, raterId, rateeId, score, comments]
            );
            if (result.insertId) {
                return c.json({ success: true, data: { ratingId: result.insertId } }, 201);
            } else {
                return c.json({ success: false, error: 'Failed to submit rating.' }, 500);
            }
        } catch (error) {
            console.error('Submit rating error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
}