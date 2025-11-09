import { Hono } from "hono";
import { Env, AuthEnv } from './core-utils';
import { getDbPool } from './db';
import { z } from 'zod';
import { authMiddleware } from "./middleware";
export function requestRoutes(app: Hono<{ Bindings: Env }>) {
    const authedApp = app as unknown as Hono<AuthEnv>;
    const requestSchema = z.object({
        offerId: z.number().int().positive(),
        note: z.string().max(1000).optional(),
    });
    authedApp.post('/api/requests', authMiddleware, async (c) => {
        const memberId = c.get('userId');
        const body = await c.req.json();
        const validation = requestSchema.safeParse(body);
        if (!validation.success) {
            return c.json({ success: false, error: 'Validation failed', details: validation.error.flatten() }, 400);
        }
        const { offerId, note } = validation.data;
        try {
            const db = getDbPool(c);
            const [existing]: any[] = await db.execute(
                'SELECT id FROM requests WHERE offer_id = ? AND member_id = ? AND status = \'OPEN\'',
                [offerId, memberId]
            );
            if (existing.length > 0) {
                return c.json({ success: false, error: 'You already have an open request for this offer.' }, 409);
            }
            const [result]: any = await db.execute(
                'INSERT INTO requests (offer_id, member_id, note) VALUES (?, ?, ?)',
                [offerId, memberId, note]
            );
            if (result.insertId) {
                return c.json({ success: true, data: { requestId: result.insertId } }, 201);
            } else {
                return c.json({ success: false, error: 'Failed to create request' }, 500);
            }
        } catch (error) {
            console.error('Create request error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    authedApp.get('/api/requests', authMiddleware, async (c) => {
        const userId = c.get('userId');
        const { type } = c.req.query(); // 'incoming' or 'outgoing'
        try {
            const db = getDbPool(c);
            let query;
            const params = [userId];
            const baseQuery = `
                SELECT
                    r.id, r.offer_id, r.member_id, r.note, r.status, r.created_at,
                    JSON_OBJECT('id', o.id, 'title', o.title, 'rate_per_hour', o.rate_per_hour) as offer,
                    JSON_OBJECT('id', m.id, 'name', m.name, 'email', m.email) as member
                FROM requests r
                JOIN offers o ON r.offer_id = o.id
                JOIN members m ON r.member_id = m.id
            `;
            if (type === 'incoming') {
                query = `${baseQuery} WHERE o.provider_id = ? ORDER BY r.created_at DESC`;
            } else { // 'outgoing' is the default
                query = `${baseQuery} WHERE r.member_id = ? ORDER BY r.created_at DESC`;
            }
            const [rows] = await db.execute(query, params);
            return c.json({ success: true, data: rows });
        } catch (error) {
            console.error('Get requests error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
}