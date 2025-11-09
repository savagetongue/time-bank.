import { Hono } from "hono";
import { Env, AuthEnv } from './core-utils';
import { getClient } from './db';
import { z } from 'zod';
import { User } from '@shared/types';
import { authMiddleware } from "./middleware";
// Helper for password hashing
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    const authedApp = app as Hono<AuthEnv>;
    // Test DB connection
    app.get('/api/db-test', async (c) => {
        try {
            const db = getClient(c);
            const [rows] = await db.query('SELECT 1 + 1 AS solution');
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
            const [result]: any = await db.query(
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
            const [rows]: any[] = await db.query('SELECT id, name, email, password_hash, is_provider, created_at FROM members WHERE email = ?', [email]);
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
    authedApp.get('/api/me', authMiddleware, async (c) => {
        const userId = c.get('userId');
        try {
            const db = getClient(c);
            const [rows]: any[] = await db.query('SELECT id, name, email, is_provider, created_at FROM members WHERE id = ?', [userId]);
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
    authedApp.get('/api/me/offers', authMiddleware, async (c) => {
        const userId = c.get('userId');
        try {
            const db = getClient(c);
            const [rows] = await db.query('SELECT * FROM offers WHERE provider_id = ? ORDER BY created_at DESC', [userId]);
            return c.json({ success: true, data: rows });
        } catch (error) {
            console.error('Get my offers error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    // --- Members ---
    app.get('/api/members', async (c) => {
        try {
            const db = getClient(c);
            const [rows] = await db.query('SELECT id, name, email, is_provider, created_at FROM members ORDER BY created_at DESC');
            return c.json({ success: true, data: rows });
        } catch (error) {
            console.error('Get members error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    app.get('/api/members/:id', (c) => c.json({ message: `Not Implemented for id: ${c.req.param('id')}` }, 501));
    app.put('/api/members/:id', (c) => c.json({ message: `Not Implemented for id: ${c.req.param('id')}` }, 501));
    // --- Offers ---
    app.get('/api/offers', async (c) => {
        const { limit } = c.req.query();
        try {
            const db = getClient(c);
            let query = `
                SELECT
                    o.id, o.provider_id, o.title, o.description, o.skills, o.rate_per_hour, o.is_active, o.created_at,
                    JSON_OBJECT('id', m.id, 'name', m.name, 'email', m.email) as provider
                FROM offers o
                JOIN members m ON o.provider_id = m.id
                WHERE o.is_active = TRUE
                ORDER BY o.created_at DESC
            `;
            const params: (string | number)[] = [];
            if (limit) {
                query += ' LIMIT ?';
                params.push(parseInt(limit, 10));
            }
            const [rows] = await db.query(query, params);
            return c.json({ success: true, data: rows });
        } catch (error) {
            console.error('Get offers error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    const offerSchema = z.object({
        title: z.string().min(5).max(255),
        description: z.string().min(10),
        skills: z.array(z.string()).min(1),
        rate_per_hour: z.number().positive(),
    });
    authedApp.post('/api/offers', authMiddleware, async (c) => {
        const provider_id = c.get('userId');
        const body = await c.req.json();
        const validation = offerSchema.safeParse(body);
        if (!validation.success) {
            return c.json({ success: false, error: 'Validation failed', details: validation.error.flatten() }, 400);
        }
        const { title, description, skills, rate_per_hour } = validation.data;
        try {
            const db = getClient(c);
            const [result]: any = await db.query(
                'INSERT INTO offers (provider_id, title, description, skills, rate_per_hour) VALUES (?, ?, ?, ?, ?)',
                [provider_id, title, description, JSON.stringify(skills), rate_per_hour]
            );
            if (result.insertId) {
                return c.json({ success: true, data: { offerId: result.insertId } });
            } else {
                return c.json({ success: false, error: 'Failed to create offer' }, 500);
            }
        } catch (error) {
            console.error('Create offer error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    app.put('/api/offers/:id', (c) => c.json({ message: `Not Implemented for id: ${c.req.param('id')}` }, 501));
    // --- Bookings & Escrow ---
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