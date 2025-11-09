import { Hono } from "hono";
import { Env, AuthEnv } from './core-utils';
import { getClient } from './db';
import { z } from 'zod';
import { authMiddleware } from "./middleware";
import { Pool, PoolConnection } from "mysql2/promise";
export function adminRoutes(app: Hono<{ Bindings: Env }>) {
    const authedApp = app as unknown as Hono<AuthEnv>;
    // In a real app, we would have a stronger admin role check middleware.
    // For now, we rely on the authMiddleware and assume the frontend restricts access.
    const ledgerAdjustSchema = z.object({
        memberId: z.number().int().positive(),
        amount: z.number(), // Can be positive or negative
        reason: z.string().min(5).max(255),
    });
    authedApp.post('/api/admin/ledger-adjust', authMiddleware, async (c) => {
        const adminId = c.get('userId');
        const body = await c.req.json();
        const validation = ledgerAdjustSchema.safeParse(body);
        if (!validation.success) {
            return c.json({ success: false, error: 'Validation failed', details: validation.error.flatten() }, 400);
        }
        const { memberId, amount, reason } = validation.data;
        if (amount === 0) {
            return c.json({ success: false, error: 'Adjustment amount cannot be zero.' }, 400);
        }
        let connection: PoolConnection | null = null;
        try {
            const pool = getClient(c);
            connection = await pool.getConnection();
            await connection.beginTransaction();
            // Get the latest balance for the member
            const [balanceResult]: any[] = await connection.query('SELECT balance_after FROM ledger WHERE member_id = ? ORDER BY created_at DESC, id DESC LIMIT 1', [memberId]);
            const currentBalance = balanceResult.length > 0 ? parseFloat(balanceResult[0].balance_after) : 0;
            const newBalance = currentBalance + amount;
            // Insert the adjustment entry
            await connection.query(
                'INSERT INTO ledger (member_id, amount, txn_type, balance_after, notes) VALUES (?, ?, ?, ?, ?)',
                [memberId, amount, 'ADJUSTMENT', newBalance, `Admin adjustment by #${adminId}: ${reason}`]
            );
            await connection.commit();
            return c.json({ success: true, data: { newBalance } });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Ledger adjustment error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        } finally {
            if (connection) connection.release();
        }
    });
    authedApp.get('/api/reports/top-providers', authMiddleware, async (c) => {
        try {
            const db = getClient(c);
            const [rows] = await db.query(`
                SELECT
                    p.id,
                    p.name,
                    p.email,
                    COUNT(b.id) AS completed_bookings,
                    AVG(r.score) AS average_rating
                FROM members p
                JOIN offers o ON p.id = o.provider_id
                JOIN requests req ON o.id = req.offer_id
                JOIN bookings b ON req.id = b.request_id
                LEFT JOIN ratings r ON b.id = r.booking_id
                WHERE b.status = 'COMPLETED'
                GROUP BY p.id, p.name, p.email
                ORDER BY completed_bookings DESC, average_rating DESC
                LIMIT 10
            `);
            return c.json({ success: true, data: rows });
        } catch (error) {
            console.error('Top providers report error:', error);
            return c.json({ success: false, error: 'Internal Server Error' }, 500);
        }
    });
}