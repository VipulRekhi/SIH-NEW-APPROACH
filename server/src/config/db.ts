import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error] Unexpected client error:', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development') {
    // Debug log query execution time without exposing sensitive data
    // console.log(`[Executed Query] took ${duration}ms`);
  }
  return res;
}

export async function testDbConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT NOW()');
    return !!res.rows[0];
  } catch (err) {
    console.error('[PostgreSQL] Connection check failed:', err);
    return false;
  }
}
