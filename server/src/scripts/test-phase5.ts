import { pool } from '../config/db.js';
import { UserRepository } from '../repositories/user.repository.js';
import { RoleRepository } from '../repositories/role.repository.js';
import { InstrumentRepository } from '../repositories/instrument.repository.js';
import { TestSessionRepository } from '../repositories/test-session.repository.js';
import { TestSessionService } from '../services/test-session.service.js';
import { ReportService } from '../services/report.service.js';
import { comparePassword } from '../utils/password.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('STARTING PHASE 5 AUTOMATED ROLE & WORKFLOW SUITE');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // TEST 1: DEMO PERSONAS AUTHENTICATION & SEED VERIFICATION
    // ----------------------------------------------------
    console.log('[TEST 1] Verifying Three Institutional Demo Personas...');

    const techUser = await UserRepository.findByEmailWithPassword('pramod.patil@nawi.gov.in');
    assert(!!techUser, 'PRAMOD PATIL (Technician) user exists in database');
    assert(techUser?.role_name === 'technician', 'Pramod Patil has TECHNICIAN role');
    assert(await comparePassword('Password@123', techUser!.password_hash), 'Pramod Patil authenticates with Password@123');

    const officerUser = await UserRepository.findByEmailWithPassword('anand.deshpande@nawi.gov.in');
    assert(!!officerUser, 'ANAND DESHPANDE (Officer) user exists in database');
    assert(officerUser?.role_name === 'officer', 'Anand Deshpande has OFFICER role');
    assert(await comparePassword('Password@123', officerUser!.password_hash), 'Anand Deshpande authenticates with Password@123');

    const adminUser = await UserRepository.findByEmailWithPassword('rakesh.sharma@nawi.gov.in');
    assert(!!adminUser, 'RAKESH SHARMA (Admin) user exists in database');
    assert(adminUser?.role_name === 'admin', 'Rakesh Sharma has ADMIN role');
    assert(await comparePassword('Admin@123456', adminUser!.password_hash), 'Rakesh Sharma authenticates with Admin@123456');

    const techJwt = {
      userId: techUser!.id,
      email: techUser!.email,
      role: techUser!.role_name as any,
      laboratoryId: techUser!.laboratory_id
    };

    const officerJwt = {
      userId: officerUser!.id,
      email: officerUser!.email,
      role: officerUser!.role_name as any,
      laboratoryId: officerUser!.laboratory_id
    };

    const adminJwt = {
      userId: adminUser!.id,
      email: adminUser!.email,
      role: adminUser!.role_name as any,
      laboratoryId: adminUser!.laboratory_id
    };

    // ----------------------------------------------------
    // TEST 2: TECHNICIAN WORKFLOW & REPORT GENERATION GUARD
    // ----------------------------------------------------
    console.log('\n[TEST 2] Technician Test Execution & Authorization Boundaries...');

    // Find test instrument
    const instRes = await pool.query('SELECT id, laboratory_id FROM instruments LIMIT 1');
    const instrumentId = instRes.rows[0].id;

    // Get core test type IDs
    const allTypes = await TestSessionRepository.getAllTestTypes();
    const coreCodes = ['WEIGHING_PERFORMANCE', 'REPEATABILITY', 'ECCENTRIC_LOADING', 'ZERO_SETTING', 'DISCRIMINATION'];
    const coreTypeIds = allTypes.filter(t => coreCodes.includes(t.code)).map(t => t.id);

    const sessionRes = await TestSessionService.createSession({
      instrumentId,
      regulatoryMode: 'INITIAL_VERIFICATION',
      testDate: '2026-09-26',
      selectedTestTypeIds: coreTypeIds,
      notes: 'Phase 5 Workflow Acceptance Test Session'
    }, techJwt);

    const sessionId = sessionRes.session.id;
    const tests = sessionRes.tests;
    console.log(`  Created Test Session ID: ${sessionId} (Workflow Status: ${sessionRes.session.workflow_status})`);
    assert(sessionRes.session.workflow_status === 'DRAFT', 'Initial workflow status is DRAFT');

    const addObsAndCalc = async (testId: string, obsList: any[]) => {
      for (const obs of obsList) {
        await TestSessionService.addObservation(testId, obs, techJwt);
      }
      return await TestSessionService.calculateTest(testId, techJwt);
    };

    // 1. Weighing Performance (PASS)
    const weighTest = tests.find(t => t.code === 'WEIGHING_PERFORMANCE')!;
    await addObsAndCalc(weighTest.id, [
      { sequenceNo: 1, direction: 'LOADING', loadValue: 0, indicationValue: 0, additionalLoad: 0.005 },
      { sequenceNo: 2, direction: 'LOADING', loadValue: 5, indicationValue: 5.000, additionalLoad: 0.005 },
      { sequenceNo: 3, direction: 'LOADING', loadValue: 15, indicationValue: 15.005, additionalLoad: 0.005 },
      { sequenceNo: 4, direction: 'LOADING', loadValue: 30, indicationValue: 30.005, additionalLoad: 0.005 }
    ]);

    // 2. Eccentric Loading (PASS)
    const eccTest = tests.find(t => t.code === 'ECCENTRIC_LOADING')!;
    await addObsAndCalc(eccTest.id, [
      { sequenceNo: 1, position: 'CENTER', loadValue: 10, indicationValue: 10.000, additionalLoad: 0.005 },
      { sequenceNo: 2, position: 'FRONT_LEFT', loadValue: 10, indicationValue: 10.005, additionalLoad: 0.005 },
      { sequenceNo: 3, position: 'BACK_LEFT', loadValue: 10, indicationValue: 10.005, additionalLoad: 0.005 },
      { sequenceNo: 4, position: 'BACK_RIGHT', loadValue: 10, indicationValue: 10.005, additionalLoad: 0.005 },
      { sequenceNo: 5, position: 'FRONT_RIGHT', loadValue: 10, indicationValue: 10.005, additionalLoad: 0.005 }
    ]);

    // 3. Zero Setting (PASS)
    const zeroTest = tests.find(t => t.code === 'ZERO_SETTING')!;
    await addObsAndCalc(zeroTest.id, [
      { sequenceNo: 1, loadValue: 0, indicationValue: 0, additionalLoad: 0.0025 }
    ]);

    // 4. Discrimination (PASS)
    const discTest = tests.find(t => t.code === 'DISCRIMINATION')!;
    await addObsAndCalc(discTest.id, [
      { sequenceNo: 1, loadValue: 20, indicationValue: 20.005, additionalLoad: 0.007 }
    ]);

    // 5. Repeatability (PASS)
    const repTest = tests.find(t => t.code === 'REPEATABILITY')!;
    await addObsAndCalc(repTest.id, [
      { sequenceNo: 1, repeatNumber: 1, loadValue: 15, indicationValue: 15.000 },
      { sequenceNo: 2, repeatNumber: 2, loadValue: 15, indicationValue: 15.000 },
      { sequenceNo: 3, repeatNumber: 3, loadValue: 15, indicationValue: 15.005 }
    ]);

    const evalBeforeSubmit = await TestSessionService.evaluateSessionOverallStatus(sessionId);
    console.log('  evalBeforeSubmit:', evalBeforeSubmit.overallStatus, evalBeforeSubmit.explanation);
    assert(evalBeforeSubmit.overallStatus === 'PASSED', 'Authoritative test calculation evaluated to PASSED by engine');

    // Technician CANNOT generate official reports
    let techReportBlocked = false;
    try {
      await ReportService.generateReport(sessionId, techJwt, 'http://localhost:5173', false);
    } catch (err: any) {
      if (err.statusCode === 403 || err.code === 'FORBIDDEN') {
        techReportBlocked = true;
      }
    }
    assert(techReportBlocked, 'TECHNICIAN is strictly prohibited from generating official report (403 FORBIDDEN)');

    // ----------------------------------------------------
    // TEST 3: SUBMISSION & LOCK ENFORCEMENT
    // ----------------------------------------------------
    console.log('\n[TEST 3] Technician Submits Session for Review & Observation Locking...');

    const submitted = await TestSessionService.submitForReview(sessionId, techJwt);
    assert(submitted.session.workflow_status === 'SUBMITTED_FOR_REVIEW', 'Session workflow transitions to SUBMITTED_FOR_REVIEW');

    // Technician observations are now locked
    let obsModificationBlocked = false;
    try {
      await TestSessionService.addObservation(repTest!.id, {
        sequenceNo: 4,
        loadValue: 20,
        indicationValue: 20.000
      }, techJwt);
    } catch (err: any) {
      if (err.statusCode === 403 && err.code === 'SESSION_LOCKED') {
        obsModificationBlocked = true;
      }
    }
    assert(obsModificationBlocked, 'Submitted observations are LOCKED against silent technician modification');

    // ----------------------------------------------------
    // TEST 4: OFFICER REVIEW, RETURN & RE-SUBMIT WORKFLOW
    // ----------------------------------------------------
    console.log('\n[TEST 4] Officer Review, Return for Correction & Resubmission...');

    // Officer inspects
    const underReview = await TestSessionService.startReview(sessionId, officerJwt);
    assert(underReview.session.workflow_status === 'UNDER_REVIEW', 'Officer marks session UNDER_REVIEW');

    // Officer returns for correction
    const returned = await TestSessionService.returnForCorrection(
      sessionId,
      'Please verify zero setting environmental calibration reading.',
      officerJwt
    );
    assert(returned.session.workflow_status === 'RETURNED_FOR_CORRECTION', 'Session returned to technician for correction');
    assert(returned.session.reviewer_comments.includes('zero setting'), 'Return comments are preserved in session record');

    // Technician is now unlocked to add/modify data
    let modificationAllowedAfterReturn = false;
    try {
      await TestSessionService.addObservation(repTest!.id, {
        sequenceNo: 4,
        loadValue: 15,
        indicationValue: 15.000,
        repeatNumber: 4
      }, techJwt);
      modificationAllowedAfterReturn = true;
    } catch (err) {
      modificationAllowedAfterReturn = false;
    }
    assert(modificationAllowedAfterReturn, 'Observations unlocked for technician after officer returned for correction');

    // Clean up observation 4 to keep repeatability standard
    const obsList = await TestSessionRepository.getObservationsForTest(repTest!.id);
    const obs4 = obsList.find(o => o.sequence_no === 4);
    if (obs4) {
      await TestSessionRepository.deleteObservation(obs4.id, repTest!.id);
      await TestSessionService.calculateTest(repTest!.id, techJwt);
    }

    // Resubmit for review
    const resubmitted = await TestSessionService.submitForReview(sessionId, techJwt);
    assert(resubmitted.session.workflow_status === 'SUBMITTED_FOR_REVIEW', 'Technician resubmitted corrected test for review');

    // ----------------------------------------------------
    // TEST 5: SAFETY RULES & OFFICER APPROVAL GATE
    // ----------------------------------------------------
    console.log('\n[TEST 5] Metrological Safety Gate & Officer Approval...');

    // Admin CANNOT approve test sessions
    let adminApprovalBlocked = false;
    try {
      await TestSessionService.approveSession(sessionId, 'Admin trying to approve', adminJwt);
    } catch (err: any) {
      if (err.statusCode === 403) {
        adminApprovalBlocked = true;
      }
    }
    assert(adminApprovalBlocked, 'ADMIN cannot approve test session (Metrological authority reserved for Officer)');

    // Officer approves session
    const approved = await TestSessionService.approveSession(sessionId, 'Fully verified compliant with OIML R 76-1:2006.', officerJwt);
    assert(approved.session.workflow_status === 'APPROVED', 'Officer approved test session (Status: APPROVED)');

    // Officer issues official report
    const report = await ReportService.generateReport(sessionId, officerJwt, 'http://localhost:5173', true);
    assert(!!report.report_number, `Official Report issued: ${report.report_number}`);
    assert(!!report.certificate_pdf_path, '1-Page Official Certificate generated');
    assert(!!report.detailed_pdf_path, 'Detailed Technical Report generated');
    assert(!!report.excel_path, 'Excel Data Workbook generated');
    assert(!!report.public_verification_id, `Public QR Verification ID created: ${report.public_verification_id}`);

    // Verify session updated to OFFICIAL_REPORT_GENERATED
    const finalSession = await TestSessionRepository.findById(sessionId);
    assert(finalSession.workflow_status === 'OFFICIAL_REPORT_GENERATED', 'Session workflow transitions to OFFICIAL_REPORT_GENERATED');

    // ----------------------------------------------------
    // TEST 6: CANONICAL COMPLIANCE CONSISTENCY
    // ----------------------------------------------------
    console.log('\n[TEST 6] Canonical Compliance Consistency Across All Outputs...');

    const pubVerif = await ReportService.getPublicVerification(report.public_verification_id);
    assert(pubVerif.overallStatus === report.overall_status, `Public verification status (${pubVerif.overallStatus}) matches Report status (${report.overall_status})`);
    assert(pubVerif.reportNumber === report.report_number, 'Public QR verification report number matches');

    // ----------------------------------------------------
    // TEST 7: INSTRUMENT HISTORY & AUDIT TRAIL
    // ----------------------------------------------------
    console.log('\n[TEST 7] Instrument History & Audit Trail Traceability...');

    const history = await TestSessionRepository.getInstrumentHistory(instrumentId);
    assert(history.length > 0, `Instrument history retrieved (${history.length} records)`);
    const historyItem = history.find((h: any) => h.id === sessionId);
    assert(!!historyItem, 'Newly executed session appears in instrument history');
    assert(historyItem.report_number === report.report_number, 'Instrument history links directly to official report');

    console.log('\n====================================================');
    console.log('ALL PHASE 5 TESTS COMPLETED WITH 100% SUCCESS!');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ PHASE 5 TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runPhase5Tests();
