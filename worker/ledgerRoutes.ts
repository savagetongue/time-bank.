import { Hono } from "hono";
import { Env, AuthEnv } from './core-utils';
import { getClient } from './db';
import { authMiddleware } from "./middleware";
import { Pool } from "mysql2/promise";
export function ledgerRoutes(app: Hono<{ Bindings: Env }>) {
    const authedApp = app as unknown as Hono<AuthEnv>;
    authedApp.get('/api/ledger', authMiddleware, async (c) => {
        const userId = c.get('userId');
        try {
            const db = getClient(c) as Pool;
            const [ledgerEntries] = await db.query(
                'SELECT id, booking_id, amount, txn_type, balance_after, notes, created_at FROM ledger WHERE member_id = ? ORDER BY created_at DESC, id DESC',
                [userId]
            );
            return c.json({ success: true, data: ledgerEntries });
        } catch (error) {
            console.error('Get ledger error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
    authedApp.get('/api/balance', authMiddleware, async (c) => {
        const userId = c.get('userId');
        try {
            const db = getClient(c) as Pool;
            const [rows]: any[] = await db.query(
                'SELECT balance_after FROM ledger WHERE member_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
                [userId]
            );
            const balance = rows.length > 0 ? parseFloat(rows[0].balance_after) : 0;
            return c.json({ success: true, data: { balance } });
        } catch (error) {
            console.error('Get balance error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
}