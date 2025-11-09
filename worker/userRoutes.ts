import { Hono } from "hono";
import { Env } from './core-utils';
import { getClient } from './db';
import { z } from 'zod';
import { User } from '@shared/types';
import { MiddlewareHandler } from "hono/types";
// Helper for password hashing
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// Auth Middleware (simple token check for now)
const authMiddleware: MiddlewareHandler = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const token = authHeader.substring(7);
    // In a real app, you'd verify a JWT. Here we just check our mock token format.
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
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // Test DB connection
    app.get('/api/db-test', async (c) => {
        try {
            const db = getClient(c);
            const [rows] = await db.execute('SELECT 1 + 1 AS solution');
            return c.json({ success: true, data: rows });
        } catch (error) {
            console.error('DB connection test failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown database error occurred.';
            return c.json({ success: false, error: errorMessage }, 500);
        }
    });
    // --- Auth & Account ---
    const registerSchema = z.object({
        name: z.string().min(2).max(150),
        email: z.string().email(),
        password: z.string().min(8),
    });
    app.post('/api/register', async (c) => {
        const body = await c.req.json();
        const validation = registerSchema.safeParse(body);
        if (!validation.success) {
            return c.json({ success: false, error: 'Validation failed', details: validation.error.flatten() }, 400);
        }
        const { name, email, password } = validation.data;
        const password_hash = await hashPassword(password);
        try {
            const db = getClient(c);
            const [result]: any = await db.execute(
                'INSERT INTO members (name, email, password_hash) VALUES (?, ?, ?)',
                [name, email, password_hash]
            );
            if (result.insertId) {
                return c.json({ success: true, data: { memberId: result.insertId } });
            } else {
                return c.json({ success: false, error: 'Failed to create user' }, 500);
            }
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                return c.json({ success: false, error: 'An account with this email already exists.' }, 409);
            }
            console.error('Registration error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
    });
    app.post('/api/login', async (c) => {
        const body = await c.req.json();
        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
            return c.json({ success: false, error: 'Validation failed', details: validation.error.flatten() }, 400);
        }
        const { email, password } = validation.data;
        try {
            const db = getClient(c);
            const [rows]: any[] = await db.execute('SELECT id, name, email, password_hash, is_provider, created_at FROM members WHERE email = ?', [email]);
            if (rows.length === 0) {
                return c.json({ success: false, error: 'Invalid credentials' }, 401);
            }
            const user = rows[0];
            const password_hash = await hashPassword(password);
            if (password_hash !== user.password_hash) {
                return c.json({ success: false, error: 'Invalid credentials' }, 401);
            }
            const userPayload: User = {
                id: user.id,
                name: user.name,
                email: user.email,
                roles: user.is_provider ? ['member', 'provider'] : ['member'],
                is_provider: !!user.is_provider,
                created_at: user.created_at,
            };
            const token = `mock-token-for-user-${user.id}`;
            return c.json({ success: true, data: { user: userPayload, token } });
        } catch (error) {
            console.error('Login error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    app.get('/api/me', authMiddleware, async (c) => {
        const userId = c.get('userId');
        try {
            const db = getClient(c);
            const [rows]: any[] = await db.execute('SELECT id, name, email, is_provider, created_at FROM members WHERE id = ?', [userId]);
            if (rows.length === 0) {
                return c.json({ success: false, error: 'User not found' }, 404);
            }
            const user = rows[0];
            const userPayload: User = {
                id: user.id,
                name: user.name,
                email: user.email,
                roles: user.is_provider ? ['member', 'provider'] : ['member'],
                is_provider: !!user.is_provider,
                created_at: user.created_at,
            };
            return c.json({ success: true, data: userPayload });
        } catch (error) {
            console.error('Get me error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    // --- Members ---
    app.get('/api/members', async (c) => {
        try {
            const db = getClient(c);
            const [rows] = await db.execute('SELECT id, name, email, is_provider, created_at FROM members ORDER BY created_at DESC');
            return c.json({ success: true, data: rows });
        } catch (error) {
            console.error('Get members error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    app.get('/api/members/:id', (c) => c.json({ message: `Not Implemented for id: ${c.req.param('id')}` }, 501));
    app.put('/api/members/:id', (c) => c.json({ message: `Not Implemented for id: ${c.req.param('id')}` }, 501));
    // --- Offers ---
    app.get('/api/offers', (c) => c.json({ message: 'Not Implemented' }, 501));
    app.post('/api/offers', (c) => c.json({ message: 'Not Implemented' }, 501));
    app.put('/api/offers/:id', (c) => c.json({ message: `Not Implemented for id: ${c.req.param('id')}` }, 501));
    // --- Requests ---
    app.post('/api/requests', (c) => c.json({ message: 'Not Implemented' }, 501));
    app.get('/api/requests', (c) => c.json({ message: 'Not Implemented' }, 501));
    // --- Bookings & Escrow ---
    app.post('/api/bookings', (c) => c.json({ message: 'Not Implemented' }, 501));
    app.post('/api/bookings/:id/complete', (c) => c.json({ message: `Not Implemented for id: ${c.req.param('id')}` }, 501));
    app.post('/api/bookings/:id/cancel', (c) => c.json({ message: `Not Implemented for id: ${c.req.param('id')}` }, 501));
    // --- Ledger ---
    app.get('/api/ledger', (c) => c.json({ message: 'Not Implemented' }, 501));
    app.get('/api/balance', (c) => c.json({ message: 'Not Implemented' }, 501));
    // --- Ratings ---
    app.post('/api/ratings', (c) => c.json({ message: 'Not Implemented' }, 501));
    // --- Disputes ---
    app.post('/api/disputes', (c) => c.json({ message: 'Not Implemented' }, 501));
    app.post('/api/disputes/:id/evidence', (c) => c.json({ message: `Not Implemented for id: ${c.req.param('id')}` }, 501));
    app.post('/api/disputes/:id/resolve', (c) => c.json({ message: `Not Implemented for id: ${c.req.param('id')}` }, 501));
    // --- Admin ---
    app.get('/api/reports/top-providers', (c) => c.json({ message: 'Not Implemented' }, 501));
    app.post('/api/admin/ledger-adjust', (c) => c.json({ message: 'Not Implemented' }, 501));
}