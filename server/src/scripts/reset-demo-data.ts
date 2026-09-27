import { pool, query } from '../config/db.js';
import { UserRepository } from '../repositories/user.repository.js';
import { InstrumentRepository } from '../repositories/instrument.repository.js';
import { FileRepository } from '../repositories/file.repository.js';
import { OcrRepository } from '../repositories/ocr.repository.js';
import { TestSessionRepository } from '../repositories/test-session.repository.js';
import { TestSessionService } from '../services/test-session.service.js';
import { ReportService } from '../services/report.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage');

export async function resetDemoDatabase() {
  console.log('====================================================');
  console.log('NAWI R-76 DEMO DATABASE CLEANUP & CANONICAL SEEDING');
  console.log('====================================================\n');

  // 1. Clean existing test data, reports, test sessions, and instruments
  console.log('[Step 1] Cleaning existing false / demo test data...');
  await query('DELETE FROM reports');
  await query('DELETE FROM test_observations');
  await query('DELETE FROM test_results');
  await query('DELETE FROM test_session_tests');
  await query('DELETE FROM test_sessions');
  await query('DELETE FROM ocr_results');
  await query('DELETE FROM instrument_files');
  await query('DELETE FROM instruments');

  // Clean physical storage
  try {
    const reportsDir = path.join(STORAGE_DIR, 'reports');
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      for (const f of files) {
        if (f.endsWith('.pdf') || f.endsWith('.xlsx')) {
          fs.unlinkSync(path.join(reportsDir, f));
        }
      }
    }
  } catch (e) {
    console.warn('Notice: storage cleanup check:', e);
  }

  // 2. Ensure Default Laboratory exists
  console.log('[Step 2] Verifying laboratory and demo personas...');
  let labRes = await query('SELECT id FROM laboratories WHERE name = $1 LIMIT 1', [
    'Central Legal Metrology Testing Laboratory'
  ]);
  let labId = labRes.rows[0]?.id;
  if (!labId) {
    const newLab = await query(
      `INSERT INTO laboratories (name, address, contact_email)
       VALUES ('Central Legal Metrology Testing Laboratory',
               'Legal Metrology Bhawan, Institutional Area, New Delhi - 110003',
               'central.lab@metrology.gov.in')
       RETURNING id`
    );
    labId = newLab.rows[0].id;
  }

  // Ensure Roles
  const adminRoleRes = await query(`SELECT id FROM roles WHERE name = 'admin' LIMIT 1`);
  const officerRoleRes = await query(`SELECT id FROM roles WHERE name = 'officer' LIMIT 1`);
  const techRoleRes = await query(`SELECT id FROM roles WHERE name = 'technician' LIMIT 1`);

  const adminRoleId = adminRoleRes.rows[0]?.id;
  const officerRoleId = officerRoleRes.rows[0]?.id;
  const techRoleId = techRoleRes.rows[0]?.id;

  // Ensure Three Institutional Personas:
  // 1. Pramod Patil (Technician) - Password@123
  await query(
    `INSERT INTO users (full_name, email, password_hash, role_id, laboratory_id, is_active)
     VALUES ('Pramod Patil', 'pramod.patil@nawi.gov.in', '$2a$10$CDW/DF6qPedt6gWl8TS/Ye6VT.pIrkvRxxqPGDiXy0gUydOtIr44K', $1, $2, true)
     ON CONFLICT (email) DO UPDATE SET full_name = 'Pramod Patil', role_id = $1, laboratory_id = $2, is_active = true`,
    [techRoleId, labId]
  );

  // 2. Anand Deshpande (Officer) - Password@123
  await query(
    `INSERT INTO users (full_name, email, password_hash, role_id, laboratory_id, is_active)
     VALUES ('Anand Deshpande', 'anand.deshpande@nawi.gov.in', '$2a$10$CDW/DF6qPedt6gWl8TS/Ye6VT.pIrkvRxxqPGDiXy0gUydOtIr44K', $1, $2, true)
     ON CONFLICT (email) DO UPDATE SET full_name = 'Anand Deshpande', role_id = $1, laboratory_id = $2, is_active = true`,
    [officerRoleRes.rows[0].id, labId]
  );

  // 3. Rakesh Sharma (Admin) - Admin@123456
  await query(
    `INSERT INTO users (full_name, email, password_hash, role_id, laboratory_id, is_active)
     VALUES ('Rakesh Sharma', 'rakesh.sharma@nawi.gov.in', '$2a$10$XETwyP.tAcYWtuoSxOFb..Uk8ygmGN1651V06cLgYNvHUntWRHVt2', $1, $2, true)
     ON CONFLICT (email) DO UPDATE SET full_name = 'Rakesh Sharma', role_id = $1, laboratory_id = $2, is_active = true`,
    [adminRoleRes.rows[0].id, labId]
  );

  const techUser = await UserRepository.findByEmailWithPassword('pramod.patil@nawi.gov.in');
  const officerUser = await UserRepository.findByEmailWithPassword('anand.deshpande@nawi.gov.in');
  const adminUser = await UserRepository.findByEmailWithPassword('rakesh.sharma@nawi.gov.in');

  const techJwt = {
    userId: techUser!.id,
    email: techUser!.email,
    role: 'technician' as const,
    laboratoryId: labId
  };

  const officerJwt = {
    userId: officerUser!.id,
    email: officerUser!.email,
    role: 'officer' as const,
    laboratoryId: labId
  };

  // 3. Seed Instruments with verified device_configuration (Clause 3.6.3 NOT_APPLICABLE)
  console.log('[Step 3] Seeding 5 verified Legal Metrology Instruments...');

  const cleanConfig = {
    indicationType: 'digital',
    auxiliary_indicating_devices: 'NO',
    remote_display: 'NO',
    printer: 'NO',
    hasMultipleIndicators: false,
    hasRemoteDisplay: false,
    hasPrinter: false,
    hasEquilibriumExtension: false,
    hasTareDevice: false,
    isTiltSensitive: false,
    isRollingLoad: false,
    supportsCount: 4,
    receptorType: 'PLATFORM'
  };

  const inst1 = await InstrumentRepository.create({
    laboratoryId: labId,
    manufacturer: 'ABC Weighing Systems',
    modelNumber: 'ABC-30',
    serialNumber: 'ABX93821',
    instrumentType: 'Non-Automatic Weighing Instrument (Bench Scale)',
    accuracyClass: 'III',
    maxCapacity: 30.0,
    minCapacity: 0.2,
    scaleInterval: 0.005,
    verificationScaleInterval: 0.01,
    unit: 'kg',
    status: 'ACTIVE',
    notes: 'Primary Legal Metrology Reference Instrument for Verification.',
    deviceConfiguration: cleanConfig,
    createdBy: adminUser!.id
  });

  // Attach sample physical nameplate evidence to inst1 for review demonstration
  try {
    const inst1Dir = path.resolve(STORAGE_DIR, 'instruments', inst1.id);
    fs.mkdirSync(inst1Dir, { recursive: true });
    const sampleTarget = path.join(inst1Dir, 'nameplate_abc30.png');
    const sampleSrc = path.resolve(STORAGE_DIR, 'instruments', '93c85f3b-5c36-47a0-b475-aed8fd8bad67', '9c9bf17a-7e8d-48c5-8834-5cf856fbf8ea.png');

    if (fs.existsSync(sampleSrc)) {
      fs.copyFileSync(sampleSrc, sampleTarget);
    }

    const nameplateFile = await FileRepository.create({
      instrumentId: inst1.id,
      fileName: 'nameplate_abc30.png',
      filePath: `instruments/${inst1.id}/nameplate_abc30.png`,
      fileType: 'image/png',
      fileSize: fs.existsSync(sampleTarget) ? fs.statSync(sampleTarget).size : 2353920,
      documentType: 'NAMEPLATE',
      uploadedBy: techUser!.id
    });

    await OcrRepository.create({
      instrumentId: inst1.id,
      fileId: nameplateFile.id,
      rawText: `ABC Weighing Systems\nModel: ABC-30\nSerial No: ABX93821\nAccuracy Class: III\nMax = 30 kg\nMin = 0.2 kg\ne = 0.01 kg\nd = 0.005 kg\nOIML R 76-1:2006 Compliant`,
      extractedData: {
        manufacturer: 'ABC Weighing Systems',
        model_number: 'ABC-30',
        serial_number: 'ABX93821',
        accuracy_class: 'III',
        max_capacity: 30.0,
        min_capacity: 0.2,
        scale_interval: 0.005,
        verification_scale_interval: 0.01,
        unit: 'kg'
      },
      confidenceData: { overall: 0.98 },
      ocrStatus: 'COMPLETED',
      createdBy: techUser!.id
    });
  } catch (err) {
    console.warn('Could not seed nameplate image artifact for inst1:', err);
  }

  const inst2 = await InstrumentRepository.create({
    laboratoryId: labId,
    manufacturer: 'Essae-Teraoka',
    modelNumber: 'DS-252',
    serialNumber: 'ES-84210',
    instrumentType: 'Non-Automatic Weighing Instrument (Bench/Platform Scale)',
    accuracyClass: 'III',
    maxCapacity: 30.0,
    minCapacity: 0.2,
    scaleInterval: 0.005,
    verificationScaleInterval: 0.01,
    unit: 'kg',
    status: 'ACTIVE',
    notes: 'Commercial trade bench scale verified under OIML R-76.',
    deviceConfiguration: cleanConfig,
    createdBy: adminUser!.id
  });

  const inst3 = await InstrumentRepository.create({
    laboratoryId: labId,
    manufacturer: 'Mettler Toledo',
    modelNumber: 'ICS425',
    serialNumber: 'MT-55198',
    instrumentType: 'Non-Automatic Weighing Instrument (Compact Industrial Scale)',
    accuracyClass: 'III',
    maxCapacity: 15.0,
    minCapacity: 0.1,
    scaleInterval: 0.001,
    verificationScaleInterval: 0.005,
    unit: 'kg',
    status: 'ACTIVE',
    notes: 'Precision industrial weighing terminal.',
    deviceConfiguration: cleanConfig,
    createdBy: adminUser!.id
  });

  const inst4 = await InstrumentRepository.create({
    laboratoryId: labId,
    manufacturer: 'Sartorius',
    modelNumber: 'Combics 2',
    serialNumber: 'SB-77412',
    instrumentType: 'Non-Automatic Weighing Instrument (Industrial Floor/Bench Scale)',
    accuracyClass: 'III',
    maxCapacity: 60.0,
    minCapacity: 0.4,
    scaleInterval: 0.01,
    verificationScaleInterval: 0.02,
    unit: 'kg',
    status: 'ACTIVE',
    notes: 'Industrial platform scale submitted for verification review.',
    deviceConfiguration: cleanConfig,
    createdBy: adminUser!.id
  });

  const inst5 = await InstrumentRepository.create({
    laboratoryId: labId,
    manufacturer: 'Avery Weigh-Tronix',
    modelNumber: 'ZM301',
    serialNumber: 'AW-90214',
    instrumentType: 'Non-Automatic Weighing Instrument (Standard Bench Scale)',
    accuracyClass: 'III',
    maxCapacity: 30.0,
    minCapacity: 0.2,
    scaleInterval: 0.005,
    verificationScaleInterval: 0.01,
    unit: 'kg',
    status: 'ACTIVE',
    notes: 'Test scale undergoing compliance inspection.',
    deviceConfiguration: cleanConfig,
    createdBy: adminUser!.id
  });

  const allTestTypes = await TestSessionRepository.getAllTestTypes();
  const sessionTestTypeIds = allTestTypes
    .filter(t => ['WEIGHING_PERFORMANCE', 'REPEATABILITY', 'ECCENTRIC_LOADING', 'ZERO_SETTING', 'DISCRIMINATION', 'MULTIPLE_INDICATING_DEVICES', 'DIFFERENT_POSITIONS_OF_EQUILIBRIUM'].includes(t.code))
    .map(t => t.id);

  // Helper to add standard observations to tests
  const populateAndCalculateStandardTests = async (
    sessionId: string,
    tests: any[],
    maxCap: number,
    scaleD: number,
    verifE: number,
    failRepeatability: boolean = false
  ) => {
    // 1. Weighing Performance (PASS)
    const weighTest = tests.find((t: any) => t.code === 'WEIGHING_PERFORMANCE');
    if (weighTest) {
      const half = maxCap / 2;
      const q1 = maxCap / 4;
      await TestSessionService.addObservation(weighTest.id, { sequenceNo: 1, direction: 'LOADING', loadValue: 0, indicationValue: 0, additionalLoad: scaleD }, techJwt);
      await TestSessionService.addObservation(weighTest.id, { sequenceNo: 2, direction: 'LOADING', loadValue: q1, indicationValue: q1, additionalLoad: scaleD }, techJwt);
      await TestSessionService.addObservation(weighTest.id, { sequenceNo: 3, direction: 'LOADING', loadValue: half, indicationValue: half + scaleD, additionalLoad: scaleD }, techJwt);
      await TestSessionService.addObservation(weighTest.id, { sequenceNo: 4, direction: 'LOADING', loadValue: maxCap, indicationValue: maxCap + scaleD, additionalLoad: scaleD }, techJwt);
      await TestSessionService.calculateTest(weighTest.id, techJwt);
    }

    // 2. Eccentric Loading (PASS)
    const eccTest = tests.find((t: any) => t.code === 'ECCENTRIC_LOADING');
    if (eccTest) {
      const eccLoad = Number((maxCap / 3).toFixed(2));
      await TestSessionService.addObservation(eccTest.id, { sequenceNo: 1, position: 'CENTER', loadValue: eccLoad, indicationValue: eccLoad, additionalLoad: scaleD }, techJwt);
      await TestSessionService.addObservation(eccTest.id, { sequenceNo: 2, position: 'FRONT_LEFT', loadValue: eccLoad, indicationValue: eccLoad + scaleD, additionalLoad: scaleD }, techJwt);
      await TestSessionService.addObservation(eccTest.id, { sequenceNo: 3, position: 'BACK_LEFT', loadValue: eccLoad, indicationValue: eccLoad + scaleD, additionalLoad: scaleD }, techJwt);
      await TestSessionService.addObservation(eccTest.id, { sequenceNo: 4, position: 'BACK_RIGHT', loadValue: eccLoad, indicationValue: eccLoad + scaleD, additionalLoad: scaleD }, techJwt);
      await TestSessionService.addObservation(eccTest.id, { sequenceNo: 5, position: 'FRONT_RIGHT', loadValue: eccLoad, indicationValue: eccLoad + scaleD, additionalLoad: scaleD }, techJwt);
      await TestSessionService.calculateTest(eccTest.id, techJwt);
    }

    // 3. Zero Setting (PASS)
    const zeroTest = tests.find((t: any) => t.code === 'ZERO_SETTING');
    if (zeroTest) {
      await TestSessionService.addObservation(zeroTest.id, { sequenceNo: 1, loadValue: 0, indicationValue: 0, additionalLoad: verifE * 0.5 }, techJwt);
      await TestSessionService.calculateTest(zeroTest.id, techJwt);
    }

    // 4. Discrimination (PASS)
    const discTest = tests.find((t: any) => t.code === 'DISCRIMINATION');
    if (discTest) {
      const discLoad = Number((maxCap * 0.6).toFixed(1));
      await TestSessionService.addObservation(discTest.id, { sequenceNo: 1, loadValue: discLoad, indicationValue: discLoad + scaleD, additionalLoad: scaleD * 1.4 }, techJwt);
      await TestSessionService.calculateTest(discTest.id, techJwt);
    }

    // 5. Repeatability (PASS or FAIL)
    const repTest = tests.find((t: any) => t.code === 'REPEATABILITY');
    if (repTest) {
      const repLoad = maxCap / 2;
      if (failRepeatability) {
        // High variation Delta_I = 0.025 kg > MPE (0.010 kg) -> FAIL
        for (let i = 1; i <= 10; i++) {
          const val = (i === 4 || i === 8) ? repLoad + (verifE * 2.5) : repLoad;
          await TestSessionService.addObservation(repTest.id, { sequenceNo: i, repeatNumber: i, loadValue: repLoad, indicationValue: val }, techJwt);
        }
      } else {
        // Compliant Delta_I = 0.002 kg <= MPE -> PASS
        for (let i = 1; i <= 10; i++) {
          const val = (i % 3 === 0) ? repLoad + (scaleD * 0.5) : repLoad;
          await TestSessionService.addObservation(repTest.id, { sequenceNo: i, repeatNumber: i, loadValue: repLoad, indicationValue: val }, techJwt);
        }
      }
      await TestSessionService.calculateTest(repTest.id, techJwt);
    }

    // Evaluate applicability for secondary modules
    await TestSessionService.reEvaluateApplicabilityForSession(sessionId);
  };

  // ----------------------------------------------------
  // RECORD 1: APPROVED + PASSED (ABC-30)
  // ----------------------------------------------------
  console.log('\n[Step 4] Creating Record 1: APPROVED + PASSED (TS-2026-00101)...');
  const s1Res = await TestSessionService.createSession({
    instrumentId: inst1.id,
    regulatoryMode: 'INITIAL_VERIFICATION',
    testDate: '2026-09-24',
    selectedTestTypeIds: sessionTestTypeIds,
    environmentalConditions: { temperature: 22.5, humidity: 52, pressure: 1013 },
    notes: 'Demonstration Benchmark Verification — Compliant OIML R-76 evaluation.'
  }, techJwt);

  await query(`UPDATE test_sessions SET session_number = 'TS-2026-00101' WHERE id = $1`, [s1Res.session.id]);
  await populateAndCalculateStandardTests(s1Res.session.id, s1Res.tests, 30.0, 0.005, 0.010, false);
  await TestSessionService.submitForReview(s1Res.session.id, techJwt);
  await TestSessionService.approveSession(s1Res.session.id, 'Metrologically compliant with all Clause 3 MPE requirements.', officerJwt);
  const rep1 = await ReportService.generateReport(s1Res.session.id, officerJwt, 'http://localhost:5173', true);
  await query(`UPDATE reports SET report_number = 'R76-2026-000101', public_verification_id = 'VER-2026-ABC30-01' WHERE id = $1`, [rep1.id]);
  console.log(`  ✓ Record 1 created: TS-2026-00101 (APPROVED, PASS, Report: R76-2026-000101)`);

  // ----------------------------------------------------
  // RECORD 2: APPROVED + PASSED (Essae DS-252)
  // ----------------------------------------------------
  console.log('\n[Step 5] Creating Record 2: APPROVED + PASSED (TS-2026-00102)...');
  const s2Res = await TestSessionService.createSession({
    instrumentId: inst2.id,
    regulatoryMode: 'SUBSEQUENT_VERIFICATION',
    testDate: '2026-09-25',
    selectedTestTypeIds: sessionTestTypeIds,
    environmentalConditions: { temperature: 23.0, humidity: 50, pressure: 1012 },
    notes: 'Subsequent periodic legal verification.'
  }, techJwt);

  await query(`UPDATE test_sessions SET session_number = 'TS-2026-00102' WHERE id = $1`, [s2Res.session.id]);
  await populateAndCalculateStandardTests(s2Res.session.id, s2Res.tests, 30.0, 0.005, 0.010, false);
  await TestSessionService.submitForReview(s2Res.session.id, techJwt);
  await TestSessionService.approveSession(s2Res.session.id, 'Verified compliant under periodic verification.', officerJwt);
  const rep2 = await ReportService.generateReport(s2Res.session.id, officerJwt, 'http://localhost:5173', true);
  await query(`UPDATE reports SET report_number = 'R76-2026-000102', public_verification_id = 'VER-2026-DS252-02' WHERE id = $1`, [rep2.id]);
  console.log(`  ✓ Record 2 created: TS-2026-00102 (APPROVED, PASS, Report: R76-2026-000102)`);

  // ----------------------------------------------------
  // RECORD 3: APPROVED + PASSED (Mettler Toledo ICS425)
  // ----------------------------------------------------
  console.log('\n[Step 6] Creating Record 3: APPROVED + PASSED (TS-2026-00103)...');
  const s3Res = await TestSessionService.createSession({
    instrumentId: inst3.id,
    regulatoryMode: 'TYPE_EVALUATION',
    testDate: '2026-09-25',
    selectedTestTypeIds: sessionTestTypeIds,
    environmentalConditions: { temperature: 21.8, humidity: 48, pressure: 1014 },
    notes: 'Type evaluation intrinsic error verification.'
  }, techJwt);

  await query(`UPDATE test_sessions SET session_number = 'TS-2026-00103' WHERE id = $1`, [s3Res.session.id]);
  await populateAndCalculateStandardTests(s3Res.session.id, s3Res.tests, 15.0, 0.001, 0.005, false);
  await TestSessionService.submitForReview(s3Res.session.id, techJwt);
  await TestSessionService.approveSession(s3Res.session.id, 'Full compliance with precision Class III limits.', officerJwt);
  const rep3 = await ReportService.generateReport(s3Res.session.id, officerJwt, 'http://localhost:5173', true);
  await query(`UPDATE reports SET report_number = 'R76-2026-000103', public_verification_id = 'VER-2026-ICS425-03' WHERE id = $1`, [rep3.id]);
  console.log(`  ✓ Record 3 created: TS-2026-00103 (APPROVED, PASS, Report: R76-2026-000103)`);

  // ----------------------------------------------------
  // RECORD 4: SUBMITTED_FOR_REVIEW / AWAITING OFFICER ACTION (Sartorius Combics 2)
  // ----------------------------------------------------
  console.log('\n[Step 7] Creating Record 4: SUBMITTED_FOR_REVIEW (TS-2026-00104)...');
  const s4Res = await TestSessionService.createSession({
    instrumentId: inst4.id,
    regulatoryMode: 'INITIAL_VERIFICATION',
    testDate: '2026-09-26',
    selectedTestTypeIds: sessionTestTypeIds,
    environmentalConditions: { temperature: 23.5, humidity: 56, pressure: 1011 },
    notes: 'Submitted session awaiting officer technical inspection.'
  }, techJwt);

  await query(`UPDATE test_sessions SET session_number = 'TS-2026-00104' WHERE id = $1`, [s4Res.session.id]);
  await populateAndCalculateStandardTests(s4Res.session.id, s4Res.tests, 60.0, 0.010, 0.020, false);
  await TestSessionService.submitForReview(s4Res.session.id, techJwt);
  console.log(`  ✓ Record 4 created: TS-2026-00104 (SUBMITTED_FOR_REVIEW, Engine Result: PASS, In Review Queue)`);

  // ----------------------------------------------------
  // RECORD 5: REJECTED + FAILED (Avery Weigh-Tronix ZM301)
  // ----------------------------------------------------
  console.log('\n[Step 8] Creating Record 5: REJECTED + FAILED (TS-2026-00105)...');
  const s5Res = await TestSessionService.createSession({
    instrumentId: inst5.id,
    regulatoryMode: 'INITIAL_VERIFICATION',
    testDate: '2026-09-26',
    selectedTestTypeIds: sessionTestTypeIds,
    environmentalConditions: { temperature: 24.1, humidity: 58, pressure: 1010 },
    notes: 'Repeatability error exceeded maximum permissible error.'
  }, techJwt);

  await query(`UPDATE test_sessions SET session_number = 'TS-2026-00105' WHERE id = $1`, [s5Res.session.id]);
  await populateAndCalculateStandardTests(s5Res.session.id, s5Res.tests, 30.0, 0.005, 0.010, true);
  await TestSessionService.submitForReview(s5Res.session.id, techJwt);
  const rejectionReason = 'Repeatability test failed at 15 kg: observed indication difference exceeded applicable MPE.';
  await TestSessionService.rejectSession(s5Res.session.id, rejectionReason, officerJwt);
  console.log(`  ✓ Record 5 created: TS-2026-00105 (REJECTED, Result: FAILED, Reason stored)`);

  // ----------------------------------------------------
  // VERIFICATION OF EXACT METRICS (Acceptance Test 8)
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('VERIFYING EXACT ACCEPTANCE METRICS');
  console.log('====================================================');

  const countQuery = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM test_sessions WHERE workflow_status IN ('APPROVED', 'OFFICIAL_REPORT_GENERATED')) as approved,
      (SELECT COUNT(*)::int FROM test_sessions WHERE workflow_status IN ('SUBMITTED_FOR_REVIEW', 'UNDER_REVIEW')) as pending_review,
      (SELECT COUNT(*)::int FROM test_sessions WHERE workflow_status = 'REJECTED') as rejected,
      (SELECT COUNT(*)::int FROM test_sessions WHERE workflow_status = 'RETURNED_FOR_CORRECTION') as returned,
      (SELECT COUNT(*)::int FROM test_sessions WHERE (status = 'PASSED' OR status = 'PASS') AND workflow_status IN ('APPROVED', 'OFFICIAL_REPORT_GENERATED')) as passed,
      (SELECT COUNT(*)::int FROM test_sessions WHERE (status = 'FAILED' OR status = 'FAIL')) as failed,
      (SELECT COUNT(*)::int FROM test_sessions) as total_sessions,
      (SELECT COUNT(*)::int FROM reports) as total_reports
  `);

  const metrics = countQuery.rows[0];
  console.table([metrics]);

  const assertVal = (actual: number, expected: number, label: string) => {
    if (actual !== expected) {
      throw new Error(`Metric mismatch for ${label}: expected ${expected}, got ${actual}`);
    }
    console.log(`  ✓ ${label}: ${actual} (Matches expected: ${expected})`);
  };

  assertVal(metrics.approved, 3, 'Approved');
  assertVal(metrics.pending_review, 1, 'Pending / Under Review');
  assertVal(metrics.rejected, 1, 'Rejected');
  assertVal(metrics.returned, 0, 'Returned');
  assertVal(metrics.passed, 3, 'Passed');
  assertVal(metrics.failed, 1, 'Failed');
  assertVal(metrics.total_sessions, 5, 'Total Test Sessions');
  assertVal(metrics.total_reports, 3, 'Total Official Reports');

  console.log('\n✓ DEMO DATABASE RESET COMPLETED SUCCESSFULLY WITH EXACT METRICS.\n');
  return metrics;
}

// Allow CLI execution
if (process.argv[1] && process.argv[1].includes('reset-demo-data')) {
  resetDemoDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Database reset failed:', err);
      process.exit(1);
    });
}
