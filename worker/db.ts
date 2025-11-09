import { createPool, Pool, PoolConnection, FieldPacket, OkPacket, RowDataPacket } from 'mysql2/promise';
import { Context } from 'hono';
// Singleton pool instance
let pool: Pool;
/**
 * Initializes and returns a singleton MySQL connection pool.
 * @param c Hono context to access environment variables.
 * @returns The MySQL connection pool.
 */
function getDbPool(c: Context): Pool {
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
      // Add a timeout to prevent long-running queries from hanging
      connectTimeout: 10000,
    });
  }
  return pool;
}
/**
 * Executes a SQL query against the database pool.
 * @param c Hono context.
 * @param sql The SQL query string.
 * @param params Optional parameters for the query.
 * @returns A promise that resolves with the query results.
 */
export async function query<T extends RowDataPacket[] | RowDataPacket[][] | OkPacket | OkPacket[]>(
  c: Context,
  sql: string,
  params?: any[]
): Promise<[T, FieldPacket[]]> {
  const dbPool = getDbPool(c);
  return dbPool.query<T>(sql, params);
}
/**
 * Executes a series of database operations within a transaction.
 * The connection is automatically managed, and the transaction is committed
 * on success or rolled back on failure.
 * @param c Hono context.
 * @param callback An async function that receives a connection object to perform transactional queries.
 * @returns A promise that resolves with the result of the callback.
 */
export async function transaction<T>(
  c: Context,
  callback: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const dbPool = getDbPool(c);
  const connection = await dbPool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    // Re-throw the error to be handled by the calling route
    throw error;
  } finally {
    connection.release();
  }
}