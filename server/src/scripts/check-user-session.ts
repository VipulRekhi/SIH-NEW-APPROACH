import { pool } from '../config/db.js';

async function check() {
  const sessionId = '0d9db95d-8cfd-4ff6-8e3f-acee8bb49719';
  const s = await pool.query('SELECT id, session_number, status FROM test_sessions WHERE id = $1', [sessionId]);
  console.log('Session in DB:', s.rows[0]);

  const tests = await pool.query(
    'SELECT t.code, t.name, st.status, st.applicability_status FROM test_session_tests st JOIN test_types t ON st.test_type_id = t.id WHERE st.test_session_id = $1',
    [sessionId]
  );
  console.log('Tests in DB:', tests.rows);

  const rep = await pool.query(
    'SELECT id, report_number, public_verification_id, overall_status, compliance_explanation, created_at, updated_at FROM reports WHERE test_session_id = $1',
    [sessionId]
  );
  console.log('Report in DB:', rep.rows);

  process.exit(0);
}

check();
