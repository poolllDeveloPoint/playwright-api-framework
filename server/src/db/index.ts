import { Pool, Client, PoolClient } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'articlehub_test',
});

// Intercept pool.query to automatically log executed SQL queries
const originalPoolQuery = pool.query.bind(pool);
(pool as any).query = async function (queryTextOrConfig: any, values?: any, callback?: any): Promise<any> {
  const start = Date.now();
  const text = typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig?.text;
  const params = values || queryTextOrConfig?.values;

  try {
    const res = await (originalPoolQuery as any)(queryTextOrConfig, values, callback);
    const duration = Date.now() - start;
    const cleanSql = text ? text.replace(/\s+/g, ' ').trim() : '';

    // Log runtime queries (skip migration tracking, DDL logs, & health check pings)
    if (cleanSql && !cleanSql.startsWith('CREATE TABLE') && !cleanSql.includes('_migrations') && cleanSql !== 'SELECT 1') {
      console.log(`\x1b[36m[SQL Query]\x1b[0m ${cleanSql}`);
      if (params && params.length > 0) {
        console.log(`\x1b[90m  └─ Params: ${JSON.stringify(params)} | Duration: ${duration}ms | Rows: ${res?.rowCount ?? res?.rows?.length ?? 0}\x1b[0m`);
      } else {
        console.log(`\x1b[90m  └─ Duration: ${duration}ms | Rows: ${res?.rowCount ?? res?.rows?.length ?? 0}\x1b[0m`);
      }
    }
    return res;
  } catch (error: any) {
    const duration = Date.now() - start;
    console.error(`\x1b[31m[SQL Error]\x1b[0m ${text} (${duration}ms): ${error.message}`);
    throw error;
  }
};

export async function ensureDatabaseExists() {
  const dbName = process.env.DB_NAME || 'articlehub_test';
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres',
  });
  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[PostgreSQL] Database "${dbName}" created.`);
    }
  } catch {
    // ignore if already exists or connecting
  } finally {
    await client.end().catch(() => {});
  }
}
