import { query } from '../config/db.js';
import { TestSessionService } from '../services/test-session.service.js';

async function migrateExistingSessions() {
  console.log('Migrating existing test sessions to the new applicability model...');

  const sessions = await query(`SELECT id, session_number FROM test_sessions`);
  console.log(`Found ${sessions.rows.length} test session(s).`);

  for (const s of sessions.rows) {
    console.log(`Re-evaluating applicability for session ${s.session_number} (${s.id})...`);
    const evalReport = await TestSessionService.reEvaluateApplicabilityForSession(s.id);
    console.log(`Session ${s.session_number} overallStatus:`, evalReport.overallStatus);
  }

  console.log('All existing test sessions successfully updated.');
  process.exit(0);
}

migrateExistingSessions().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
