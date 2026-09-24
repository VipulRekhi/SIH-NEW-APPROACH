// test-applicability-audit.ts
// Regression & Verification test suite for Test Applicability vs Implementation State

import { ApplicabilityRules } from '../modules/testing/calculations/applicability.rules.js';
import { InstrumentApplicabilityContext } from '../modules/testing/calculations/applicability.types.js';
import { TestSessionService } from '../services/test-session.service.js';
import { TestSessionRepository } from '../repositories/test-session.repository.js';
import { query } from '../config/db.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${testName} ${details ? `- ${details}` : ''}`);
  }
}

async function runAudit() {
  console.log('================================================================');
  console.log('PHASE 3 AUDIT: TEST APPLICABILITY vs IMPLEMENTATION STATE');
  console.log('Regulatory Baseline: OIML R 76-1:2006');
  console.log('================================================================\n');

  // Baseline base context (e.g. single digital indicator electronic platform scale)
  const baseContext: InstrumentApplicabilityContext = {
    accuracyClass: 'III',
    instrumentType: 'ELECTRONIC_PLATFORM_SCALE',
    maxCapacity: 30,
    minCapacity: 0.2,
    e: 0.01,
    d: 0.005,
    unit: 'kg',
    regulatoryMode: 'TYPE_EVALUATION',
    regulationVersion: 'OIML R 76-1:2006'
  };

  // -------------------------------------------------------------------------
  // TEST 1: Normal single-indicating instrument -> Multiple Indicating Devices = NOT_APPLICABLE
  // -------------------------------------------------------------------------
  const ctxSingleIndicator: InstrumentApplicabilityContext = {
    ...baseContext,
    configuration: {
      hasMultipleIndicators: false,
      hasRemoteDisplay: false,
      hasPrinter: false
    }
  };
  const res1 = ApplicabilityRules.evaluate('MULTIPLE_INDICATING_DEVICES', ctxSingleIndicator);
  assert(
    res1.applicability === 'NOT_APPLICABLE',
    'TEST 1.1: Single-indicating instrument yields NOT_APPLICABLE for MULTIPLE_INDICATING_DEVICES'
  );
  assert(
    res1.reason.includes('does not contain the relevant additional indicating device'),
    'TEST 1.2: Cites absence of additional indicating device'
  );
  assert(
    res1.clause === 'Clause 3.6.3',
    'TEST 1.3: Cites Clause 3.6.3'
  );

  // -------------------------------------------------------------------------
  // TEST 2: Instrument with additional/remote indicating device -> Multiple Indicating Devices = APPLICABLE
  // -------------------------------------------------------------------------
  const ctxMultiIndicator: InstrumentApplicabilityContext = {
    ...baseContext,
    configuration: {
      hasMultipleIndicators: true,
      hasRemoteDisplay: true
    }
  };
  const res2 = ApplicabilityRules.evaluate('MULTIPLE_INDICATING_DEVICES', ctxMultiIndicator);
  assert(
    res2.applicability === 'APPLICABLE',
    'TEST 2.1: Instrument with remote display yields APPLICABLE for MULTIPLE_INDICATING_DEVICES'
  );
  assert(
    res2.reason.includes('Applicable: verified instrument configuration includes secondary indicator'),
    'TEST 2.2: Explains applicability for auxiliary display'
  );

  // -------------------------------------------------------------------------
  // TEST 3: Applicable multiple-indicating-device test but automation unavailable / insufficient data -> REVIEW_REQUIRED
  // -------------------------------------------------------------------------
  const ctxUnknownMulti: InstrumentApplicabilityContext = {
    ...baseContext,
    configuration: {
      // hasMultipleIndicators is undefined / unknown
    }
  };
  const res3 = ApplicabilityRules.evaluate('MULTIPLE_INDICATING_DEVICES', ctxUnknownMulti);
  assert(
    res3.applicability === 'REVIEW_REQUIRED',
    'TEST 3.1: Undefined multi-device configuration yields REVIEW_REQUIRED (cannot guess)'
  );
  assert(
    res3.reason.includes('Manual technician review required'),
    'TEST 3.2: Clearly explains that technician review is required'
  );

  // -------------------------------------------------------------------------
  // TEST 4: Instrument configuration where Different Positions of Equilibrium does not apply -> NOT_APPLICABLE
  // -------------------------------------------------------------------------
  const ctxNoEquilibrium: InstrumentApplicabilityContext = {
    ...baseContext,
    configuration: {
      hasEquilibriumExtension: false
    }
  };
  const res4 = ApplicabilityRules.evaluate('DIFFERENT_POSITIONS_OF_EQUILIBRIUM', ctxNoEquilibrium);
  assert(
    res4.applicability === 'NOT_APPLICABLE',
    'TEST 4.1: Instrument without equilibrium extension yields NOT_APPLICABLE'
  );
  assert(
    res4.clause === 'Clause 3.6.4',
    'TEST 4.2: Cites Clause 3.6.4'
  );

  // -------------------------------------------------------------------------
  // TEST 5: Instrument configuration where Different Positions of Equilibrium applies -> APPLICABLE
  // -------------------------------------------------------------------------
  const ctxWithEquilibrium: InstrumentApplicabilityContext = {
    ...baseContext,
    configuration: {
      hasEquilibriumExtension: true
    }
  };
  const res5 = ApplicabilityRules.evaluate('DIFFERENT_POSITIONS_OF_EQUILIBRIUM', ctxWithEquilibrium);
  assert(
    res5.applicability === 'APPLICABLE',
    'TEST 5.1: Instrument with equilibrium extension yields APPLICABLE'
  );

  // -------------------------------------------------------------------------
  // TEST 6: Applicable but manually reviewed equilibrium requirement -> REVIEW_REQUIRED
  // -------------------------------------------------------------------------
  const ctxUnknownEquilibrium: InstrumentApplicabilityContext = {
    ...baseContext,
    configuration: {}
  };
  const res6 = ApplicabilityRules.evaluate('DIFFERENT_POSITIONS_OF_EQUILIBRIUM', ctxUnknownEquilibrium);
  assert(
    res6.applicability === 'REVIEW_REQUIRED',
    'TEST 6.1: Unknown equilibrium extension capability yields REVIEW_REQUIRED'
  );

  // -------------------------------------------------------------------------
  // TEST 7: NOT_APPLICABLE tests do not cause overall FAIL
  // -------------------------------------------------------------------------
  // Create a temporary mock test session in database to evaluate compliance aggregation
  const sessionRes = await query(`
    SELECT ts.id FROM test_sessions ts
    JOIN instruments i ON ts.instrument_id = i.id
    WHERE LOWER(i.manufacturer) = 'essae'
    ORDER BY ts.created_at DESC LIMIT 1
  `);
  const sessionId = sessionRes.rows[0].id;

  // Set all core tests to PASS, and non-applicable to NOT_APPLICABLE
  await query(`
    UPDATE test_session_tests
    SET status = 'PASS', execution_status = 'COMPLETED'
    WHERE test_session_id = $1 AND test_type_id IN (
      SELECT id FROM test_types WHERE code IN ('WEIGHING_PERFORMANCE', 'REPEATABILITY', 'ECCENTRIC_LOADING', 'ZERO_SETTING', 'DISCRIMINATION')
    )
  `, [sessionId]);

  await query(`
    UPDATE test_session_tests
    SET status = 'NOT_APPLICABLE', applicability_status = 'NOT_APPLICABLE', execution_status = 'COMPLETED'
    WHERE test_session_id = $1 AND test_type_id IN (
      SELECT id FROM test_types WHERE code IN ('MULTIPLE_INDICATING_DEVICES', 'DIFFERENT_POSITIONS_OF_EQUILIBRIUM')
    )
  `, [sessionId]);

  const eval7 = await TestSessionService.evaluateSessionOverallStatus(sessionId);
  assert(
    eval7.overallStatus === 'PASSED',
    'TEST 7.1: Overall session is PASSED when all applicable tests pass and remaining tests are NOT_APPLICABLE'
  );
  assert(
    eval7.notApplicableTests.length >= 2,
    'TEST 7.2: notApplicableTests correctly tracks the non-applicable test modules'
  );
  assert(
    eval7.failedTests.length === 0,
    'TEST 7.3: NOT_APPLICABLE tests do not count as FAIL'
  );

  // -------------------------------------------------------------------------
  // TEST 8: REVIEW_REQUIRED applicable mandatory test prevents unconditional PASS
  // -------------------------------------------------------------------------
  await query(`
    UPDATE test_session_tests
    SET status = 'REVIEW_REQUIRED', applicability_status = 'APPLICABLE', execution_status = 'INCOMPLETE'
    WHERE test_session_id = $1 AND test_type_id IN (
      SELECT id FROM test_types WHERE code = 'DISCRIMINATION'
    )
  `, [sessionId]);

  const eval8 = await TestSessionService.evaluateSessionOverallStatus(sessionId);
  assert(
    eval8.overallStatus === 'REVIEW_REQUIRED',
    'TEST 8.1: An applicable test with REVIEW_REQUIRED prevents PASSED and makes overall status REVIEW_REQUIRED'
  );
  assert(
    eval8.reviewRequiredTests.some((t: any) => t.code === 'DISCRIMINATION'),
    'TEST 8.2: Identifies the test requiring review in summary'
  );

  // -------------------------------------------------------------------------
  // TEST 9: INCOMPLETE applicable mandatory test prevents unconditional PASS
  // -------------------------------------------------------------------------
  await query(`
    UPDATE test_session_tests
    SET status = 'IN_PROGRESS', applicability_status = 'APPLICABLE', execution_status = 'INCOMPLETE'
    WHERE test_session_id = $1 AND test_type_id IN (
      SELECT id FROM test_types WHERE code = 'DISCRIMINATION'
    )
  `, [sessionId]);

  const eval9 = await TestSessionService.evaluateSessionOverallStatus(sessionId);
  assert(
    eval9.overallStatus === 'IN_PROGRESS',
    'TEST 9.1: An applicable test in IN_PROGRESS / INCOMPLETE prevents PASSED and makes overall status IN_PROGRESS'
  );
  assert(
    eval9.incompleteTests.some((t: any) => t.code === 'DISCRIMINATION'),
    'TEST 9.2: Identifies incomplete test'
  );

  // -------------------------------------------------------------------------
  // TEST 10: FAIL applicable mandatory test causes overall FAIL
  // -------------------------------------------------------------------------
  await query(`
    UPDATE test_session_tests
    SET status = 'FAIL', applicability_status = 'APPLICABLE', execution_status = 'COMPLETED'
    WHERE test_session_id = $1 AND test_type_id IN (
      SELECT id FROM test_types WHERE code = 'WEIGHING_PERFORMANCE'
    )
  `, [sessionId]);

  const eval10 = await TestSessionService.evaluateSessionOverallStatus(sessionId);
  assert(
    eval10.overallStatus === 'FAILED',
    'TEST 10.1: An applicable test with FAIL causes overall FAILED'
  );
  assert(
    eval10.failedTests.some((t: any) => t.code === 'WEIGHING_PERFORMANCE'),
    'TEST 10.2: Identifies failed test with regulatory reference in explanation'
  );

  // Restore the session back to clean compliant state
  await query(`
    UPDATE test_session_tests
    SET status = 'PASS', applicability_status = 'APPLICABLE', execution_status = 'COMPLETED'
    WHERE test_session_id = $1 AND test_type_id IN (
      SELECT id FROM test_types WHERE code IN ('WEIGHING_PERFORMANCE', 'REPEATABILITY', 'ECCENTRIC_LOADING', 'ZERO_SETTING', 'DISCRIMINATION')
    )
  `, [sessionId]);

  await query(`
    UPDATE test_session_tests
    SET status = 'NOT_APPLICABLE', applicability_status = 'NOT_APPLICABLE', execution_status = 'COMPLETED'
    WHERE test_session_id = $1 AND test_type_id IN (
      SELECT id FROM test_types WHERE code IN ('MULTIPLE_INDICATING_DEVICES', 'DIFFERENT_POSITIONS_OF_EQUILIBRIUM')
    )
  `, [sessionId]);

  const evalFinal = await TestSessionService.evaluateSessionOverallStatus(sessionId);
  assert(
    evalFinal.overallStatus === 'PASSED',
    'RESTORE: Restored session back to clean verified PASSED state'
  );

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
