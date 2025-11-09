import { Hono } from "hono";
import { Env } from './core-utils';
import { getClient } from './db';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // This is a sample test route.
    app.get('/api/test', (c) => c.json({ success: true, data: { name: 'this works' }}));
    // Test DB connection
    app.get('/api/db-test', async (c) => {
        try {
            const db = getClient(c);
            const [rows] = await db.query('SELECT 1 + 1 AS solution');
            return c.json({ success: true, data: rows });
        } catch (error) {
            console.error('DB connection test failed:', error);
            return c.json({ success: false, error: error.message }, 500);
        }
    });
    // --- Auth & Account ---
    app.post('/api/register', (c) => c.json({ message: 'Not Implemented' }, 501));
    app.post('/api/login', (c) => c.json({ message: 'Not Implemented' }, 501));
    app.get('/api/me', (c) => c.json({ message: 'Not Implemented' }, 501));
    // --- Members ---
    app.get('/api/members', (c) => c.json({ message: 'Not Implemented' }, 501));
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