import { query } from '../config/db.js';

async function check() {
  const sessionRes = await query(`
    SELECT ts.id, ts.session_number, ts.status, ts.applicability_context,
           i.id as inst_id, i.manufacturer, i.model_number, i.accuracy_class, i.max_capacity, i.scale_interval, i.verification_scale_interval, i.unit, i.notes
    FROM test_sessions ts
    JOIN instruments i ON ts.instrument_id = i.id
    ORDER BY ts.created_at DESC
    LIMIT 1
  `);
  console.log('Latest session:', sessionRes.rows[0]);

  if (sessionRes.rows[0]) {
    const testsRes = await query(`
      SELECT tst.id, tst.status, tst.applicability_status, tst.applicability_reason, tst.execution_status, tst.calculation_summary, tt.code, tt.name, tt.implementation_state, tt.r76_reference
      FROM test_session_tests tst
      JOIN test_types tt ON tst.test_type_id = tt.id
      WHERE tst.test_session_id = $1
      ORDER BY tt.display_order ASC
    `, [sessionRes.rows[0].id]);
    console.log('Tests for session:', testsRes.rows);
  }
  process.exit(0);
}

check().catch(console.error);
