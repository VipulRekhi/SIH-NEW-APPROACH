import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool, Client } = pg;

async function ensureDatabaseExists(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const targetDb = url.pathname.replace(/^\//, '');

  // Connect to the default 'postgres' database to ensure target DB exists
  url.pathname = '/postgres';
  const adminClient = new Client({
    connectionString: url.toString()
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    );

    if (res.rowCount === 0) {
      console.log(`[Migration] Database "${targetDb}" does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`[Migration] Database "${targetDb}" created successfully.`);
    } else {
      console.log(`[Migration] Database "${targetDb}" already exists.`);
    }
  } catch (err: any) {
    console.warn(`[Migration] Notice when checking/creating database: ${err.message}`);
  } finally {
    await adminClient.end().catch(() => {});
  }
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[Migration Error] DATABASE_URL is not defined in environment variables.');
    process.exit(1);
  }

  console.log('[Migration] Ensuring database exists...');
  await ensureDatabaseExists(databaseUrl);

  const pool = new Pool({
    connectionString: databaseUrl
  });

  try {
    const client = await pool.connect();
    console.log('[Migration] Connected to database.');

    const migrationsDir = path.resolve(__dirname, '../../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`[Migration] Executing migration: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await client.query(sql);
      console.log(`[Migration] Completed: ${file}`);
    }

    client.release();
    console.log('[Migration] All migrations executed successfully.');
  } catch (err) {
    console.error('[Migration Error] Failed to execute migrations:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
