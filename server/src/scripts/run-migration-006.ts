import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  const sqlPath = path.join(__dirname, '../../migrations/006_test_applicability_and_state_model.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying migration 006_test_applicability_and_state_model.sql...');
  await query(sql);
  console.log('Migration 006 applied successfully.');
  process.exit(0);
}

applyMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
