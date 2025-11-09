import { Hono, Context } from "hono";
import { Env } from './core-utils';
import { getClient } from './db';
import { z } from 'zod';
import { MiddlewareHandler } from "hono/types";
import { Pool } from "mysql2/promise";
type AuthEnv = {
    Variables: {
        userId: number;
    };
    Bindings: Env;
}
const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const token = authHeader.substring(7);
    if (!token.startsWith('mock-token-for-user-')) {
        return c.json({ success: false, error: 'Invalid token' }, 401);
    }
    const userId = parseInt(token.replace('mock-token-for-user-', ''), 10);
    if (isNaN(userId)) {
        return c.json({ success: false, error: 'Invalid token format' }, 401);
    }
    c.set('userId', userId);
    await next();
};
export function requestRoutes(app: Hono<{ Bindings: Env }>) {
    const authedApp = app as Hono<AuthEnv>;
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
            const db = getClient(c) as Pool;
            // Check for existing open request from the same member for the same offer
            const [existing]: any[] = await db.query(
                'SELECT id FROM requests WHERE offer_id = ? AND member_id = ? AND status = \'OPEN\'',
                [offerId, memberId]
            );
            if (existing.length > 0) {
                return c.json({ success: false, error: 'You already have an open request for this offer.' }, 409);
            }
            const [result]: any = await db.query(
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
    // Placeholder for listing requests
    authedApp.get('/api/requests', authMiddleware, async (c) => {
        return c.json({ message: 'Not Implemented' }, 501);
    });
}