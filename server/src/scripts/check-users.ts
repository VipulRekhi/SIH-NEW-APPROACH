import { pool } from '../config/db.js';

async function main() {
  try {
    const res = await pool.query(`
      SELECT u.id, u.full_name, u.email, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id
      ORDER BY r.name, u.full_name;
    `);
    console.log('USERS IN DB:');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
