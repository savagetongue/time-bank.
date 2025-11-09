import { createPool, Pool } from 'mysql2/promise';
import { Context } from 'hono';

let pool: Pool;

export function getDbPool(c: Context): Pool {
  if (!pool) {
    if (!c.env.DB_HOST || !c.env.DB_USER || !c.env.DB_NAME || !c.env.DB_PASS) {
      console.error('Database environment variables are not set!');
      throw new Error('Database configuration is missing.');
    }
    pool = createPool({
      host: c.env.DB_HOST as string,
      user: c.env.DB_USER as string,
      password: c.env.DB_PASS as string,
      database: c.env.DB_NAME as string,
      port: c.env.DB_PORT ? parseInt(c.env.DB_PORT as string, 10) : 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}
//