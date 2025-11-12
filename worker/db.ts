import { Client, Transaction } from '@planetscale/database';
import { Context } from 'hono';

// Singleton client instance
let client: Client;

/**
 * Initializes and returns a singleton PlanetScale database client.
 * @param c Hono context to access environment variables.
 * @returns The PlanetScale database client.
 */
function getClient(c: Context): Client {
  if (!client) {
    if (!c.env.DB_HOST || !c.env.DB_USER || !c.env.DB_NAME || !c.env.DB_PASS) {
      console.error('Database environment variables are not set!');
      throw new Error('Database configuration is missing.');
    }
    client = new Client({
      host: c.env.DB_HOST as string,
      username: c.env.DB_USER as string,
      password: c.env.DB_PASS as string,
      database: c.env.DB_NAME as string,
    });
  }
  return client;
}

/**
 * Executes a SQL query using the PlanetScale serverless driver.
 * @param c Hono context.
 * @param sql The SQL query string.
 * @param params Optional parameters for the query.
 * @returns A promise that resolves with the query results.
 */
export async function query(c: Context, sql: string, params?: any[]) {
  const dbClient = getClient(c);
  return dbClient.execute(sql, params);
}

/**
 * Executes a series of database operations within a transaction using the PlanetScale serverless driver.
 * The transaction is automatically committed on success or rolled back on failure.
 * @param c Hono context.
 * @param callback An async function that receives a transaction object to perform transactional queries.
 * @returns A promise that resolves with the result of the callback.
 */
export async function transaction<T>(c: Context, callback: (tx: Transaction) => Promise<T>): Promise<T> {
  const dbClient = getClient(c);
  return dbClient.transaction(callback);
}