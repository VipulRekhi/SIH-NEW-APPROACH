import { query } from '../config/db.js';
import { ApplicabilityRules } from '../modules/testing/calculations/applicability.rules.js';
import { InstrumentSpecification, DeviceConfiguration } from '../modules/testing/calculations/applicability.types.js';
import { TestSessionService } from '../services/test-session.service.js';
import { ReportService } from '../services/report.service.js';
import { AuthService } from '../services/auth.service.js';
import { InstrumentService } from '../services/instrument.service.js';
import { resetDemoDatabase } from './reset-demo-data.js';

async function runVerification() {
  console.log('====================================================');
  console.log('PHASE 5 COMPREHENSIVE WORKFLOW VERIFICATION');
  console.log('====================================================\n');

  // Ensure clean starting state
  await resetDemoDatabase();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Clause 3.6.3 Applicability Resolution
    // -------------------------------------------------------------
    console.log('[TEST GROUP 1] Clause 3.6.3 Applicability (Review Required fix)');

    const specBase: InstrumentSpecification = {
      id: 'test-inst-1',
      serialNumber: 'ABC-001',
      modelNumber: 'ABC-30',
      manufacturer: 'Avery Weigh-Tronix',
      accuracyClass: 'III',
      maxCapacity: 30,
      minCapacity: 0.1,
      scaleInterval: 0.005,
      verificationScaleInterval: 0.01,
      unit: 'kg',
      isGraduated: true,
      hasZeroTracking: true
    };

    // Case A: Explicit NO
    const resA = ApplicabilityRules.evaluate('MULTIPLE_INDICATING_DEVICES', {
      accuracyClass: 'III',
      Max: 30,
      Min: 0.1,
      e: 0.01,
      d: 0.005,
      unit: 'kg',
      configuration: {
        auxiliary_indicating_devices: 'NO',
        remote_display: 'NO',
        printer: 'NO'
      }
    });
    assert(
      resA.applicability === 'NOT_APPLICABLE',
      'Explicit auxiliary_indicating_devices = NO resolves to NOT_APPLICABLE (not REVIEW_REQUIRED)'
    );

    // Case B: Explicit YES
    const resB = ApplicabilityRules.evaluate('MULTIPLE_INDICATING_DEVICES', {
      accuracyClass: 'III',
      Max: 30,
      Min: 0.1,
      e: 0.01,
      d: 0.005,
      unit: 'kg',
      configuration: {
        auxiliary_indicating_devices: 'YES',
        remote_display: 'NO',
        printer: 'NO'
      }
    });
    assert(
      resB.applicability === 'APPLICABLE',
      'Explicit auxiliary_indicating_devices = YES resolves to APPLICABLE'
    );

    // Case C: UNKNOWN
    const resC = ApplicabilityRules.evaluate('MULTIPLE_INDICATING_DEVICES', {
      accuracyClass: 'III',
      Max: 30,
      Min: 0.1,
      e: 0.01,
      d: 0.005,
      unit: 'kg',
      configuration: {
        auxiliary_indicating_devices: 'UNKNOWN',
        remote_display: 'NO',
        printer: 'NO'
      }
    });
    assert(
      resC.applicability === 'REVIEW_REQUIRED',
      'auxiliary_indicating_devices = UNKNOWN properly flags REVIEW_REQUIRED'
    );

    // Case D: Empty / undefined
    const resD = ApplicabilityRules.evaluate('MULTIPLE_INDICATING_DEVICES', {
      accuracyClass: 'III',
      Max: 30,
      Min: 0.1,
      e: 0.01,
      d: 0.005,
      unit: 'kg'
    });
    assert(
      resD.applicability === 'REVIEW_REQUIRED',
      'Undefined device configuration properly defaults to REVIEW_REQUIRED'
    );

    // -------------------------------------------------------------
    // TEST 2: Database Counts and Dashboard Metrics
    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 2] Dashboard Statistics (from PostgreSQL)');

    const statsRes = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE workflow_status IN ('APPROVED', 'OFFICIAL_REPORT_GENERATED')) as approved,
        COUNT(*) FILTER (WHERE workflow_status IN ('SUBMITTED_FOR_REVIEW', 'UNDER_REVIEW')) as pending_review,
        COUNT(*) FILTER (WHERE workflow_status = 'REJECTED') as rejected,
        COUNT(*) FILTER (WHERE workflow_status = 'RETURNED_FOR_CORRECTION') as returned,
        COUNT(*) FILTER (WHERE (status = 'PASSED' OR status = 'PASS') AND workflow_status IN ('APPROVED', 'OFFICIAL_REPORT_GENERATED')) as passed,
        COUNT(*) FILTER (WHERE status = 'FAILED' OR status = 'FAIL') as failed,
        COUNT(*) as total_sessions
      FROM test_sessions
    `);
    const s = statsRes.rows[0];

    assert(parseInt(s.approved) === 3, 'Approved count equals 3');
    assert(parseInt(s.pending_review) === 1, 'Pending/Under Review count equals 1');
    assert(parseInt(s.rejected) === 1, 'Rejected count equals 1');
    assert(parseInt(s.returned) === 0, 'Returned count equals 0');
    assert(parseInt(s.passed) === 3, 'Passed count equals 3');
    assert(parseInt(s.failed) === 1, 'Failed count equals 1');
    assert(parseInt(s.total_sessions) === 5, 'Total Test Sessions in database equals exactly 5');

    // -------------------------------------------------------------
    // TEST 3: User Personas and Role Resolution
    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 3] Demo Personas & Auth');

    const techLogin = await AuthService.login({ email: 'pramod.patil@nawi.gov.in', password: 'Password@123' });
    assert(techLogin.user.role_name === 'technician', 'Pramod Patil is authenticated as Technician');

    const officerLogin = await AuthService.login({ email: 'anand.deshpande@nawi.gov.in', password: 'Password@123' });
    assert(officerLogin.user.role_name === 'officer', 'Anand Deshpande is authenticated as Officer');

    const adminLogin = await AuthService.login({ email: 'rakesh.sharma@nawi.gov.in', password: 'Admin@123456' });
    assert(adminLogin.user.role_name === 'admin', 'Rakesh Sharma is authenticated as Admin');

    // -------------------------------------------------------------
    // TEST 4: Submission & Officer Review Queue
    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 4] Review Queue & Pending Record 4');

    const queueRes = await query(`
      SELECT session_number, workflow_status, status
      FROM test_sessions
      WHERE workflow_status = 'SUBMITTED_FOR_REVIEW'
    `);
    assert(queueRes.rows.length === 1, 'Exactly one session awaiting review in Officer Queue');
    assert(queueRes.rows[0].session_number === 'TS-2026-00104', 'Pending session is TS-2026-00104');

    // -------------------------------------------------------------
    // TEST 5: Officer Approval & Official Artifact Generation
    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 5] Officer Approval & Artifact Gating');

    // Verify session 4 has NO official reports yet
    const pendingSessionIdRes = await query(`SELECT id FROM test_sessions WHERE session_number = 'TS-2026-00104'`);
    const session4Id = pendingSessionIdRes.rows[0].id;

    const preReports = await query(`SELECT * FROM reports WHERE test_session_id = $1`, [session4Id]);
    assert(preReports.rows.length === 0, 'No official reports exist for session 4 prior to approval');

    // Officer approves session 4
    const officerPayload = {
      userId: officerLogin.user.id,
      email: officerLogin.user.email,
      role: 'officer' as const,
      laboratoryId: officerLogin.user.laboratory_id
    };

    const approvalResult = await TestSessionService.approveSession(session4Id, 'Approved for demo verification', officerPayload);
    assert(approvalResult.session.workflow_status === 'APPROVED', 'Session 4 workflow status updated to APPROVED');
    assert(approvalResult.session.approved_by === officerLogin.user.id, 'Session 4 approved_by set to Officer Anand Deshpande');
    assert(!!approvalResult.session.approved_at, 'Session 4 approved_at timestamp set');

    // Check that official artifacts were generated
    const postReports = await query(`SELECT * FROM reports WHERE test_session_id = $1`, [session4Id]);
    assert(postReports.rows.length === 1, 'Official report generated upon Officer approval');
    const r = postReports.rows[0];
    assert(!!r.report_number, `Official report number issued: ${r.report_number}`);
    assert(!!r.public_verification_id, `Official verification ID issued: ${r.public_verification_id}`);
    assert(!!r.qr_data_url, 'Official QR verification data present');
    assert(!!r.pdf_path, 'Official PDF report rendered and stored');
    assert(r.overall_status === 'PASSED', 'Official report status is PASSED');

    // Check public QR verification service
    const pubReport = await ReportService.getPublicVerification(r.public_verification_id);
    assert(pubReport.verificationId === r.public_verification_id, 'Public QR verification resolves verified ID');
    assert(pubReport.reportNumber === r.report_number, 'Public QR verification shows canonical report number');
    assert(pubReport.overallStatus === 'PASSED', 'Public QR verification matches approved engine result (PASSED)');

    // -------------------------------------------------------------
    // TEST 6: Technician Delete Restrictions
    // -------------------------------------------------------------
    console.log('\n[TEST GROUP 6] Role-based Deletion & Cascading Deletion');

    const techPayload = {
      userId: techLogin.user.id,
      email: techLogin.user.email,
      role: 'technician' as const,
      laboratoryId: techLogin.user.laboratory_id
    };

    // Technician attempts to delete the newly approved session 4 -> MUST FAIL (403)
    let techDeleteFailedAsExpected = false;
    try {
      await TestSessionService.deleteSession(session4Id, techPayload);
    } catch (e: any) {
      techDeleteFailedAsExpected = e.statusCode === 403;
    }
    assert(
      techDeleteFailedAsExpected,
      'Technician is blocked from deleting approved official session (HTTP 403 Forbidden)'
    );

    // Create a temporary draft session and verify technician CAN delete draft with cascade
    const instruments = await query(`SELECT id FROM instruments LIMIT 1`);
    const instId = instruments.rows[0].id;
    const tempSession = await TestSessionService.createSession(
      {
        instrumentId: instId,
        notes: 'Temporary draft session for deletion test'
      },
      techPayload
    );
    assert(tempSession.session.workflow_status === 'DRAFT', 'Created temporary draft session');

    // Check that tests were attached
    const testsCount = await query(`SELECT count(*) as count FROM test_session_tests WHERE test_session_id = $1`, [tempSession.session.id]);
    assert(parseInt(testsCount.rows[0].count) > 0, 'Draft session has attached tests');

    // Now delete as technician
    await TestSessionService.deleteSession(tempSession.session.id, techPayload);

    const checkDraft = await query(`SELECT id FROM test_sessions WHERE id = $1`, [tempSession.session.id]);
    assert(checkDraft.rows.length === 0, 'Draft session was successfully deleted by technician');

    const checkDraftTests = await query(`SELECT count(*) as count FROM test_session_tests WHERE test_session_id = $1`, [tempSession.session.id]);
    assert(parseInt(checkDraftTests.rows[0].count) === 0, 'Associated tests cascaded cleanly upon session deletion');

    // Audit log was created for deletion
    const auditRes = await query(`
      SELECT action, entity_type FROM audit_logs 
      WHERE entity_id = $1 AND action = 'TEST_SESSION_DELETED'
    `, [tempSession.session.id]);
    assert(auditRes.rows.length > 0, 'Immutable audit log recorded the deletion event');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log('====================================================\n');

    // Re-seed canonical state for demo
    console.log('\n[Post-verification] Re-seeding canonical demo state...');
    await resetDemoDatabase();

    if (failed === 0) {
      console.log('🎉 ALL PHASE 5 ACCEPTANCE TESTS VERIFIED SUCCESSFULLY!');
    } else {
      console.error('❌ SOME TESTS FAILED.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected error during verification:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runVerification();
