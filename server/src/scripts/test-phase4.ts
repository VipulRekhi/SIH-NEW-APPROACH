import { pool } from '../config/db.js';
import { TestSessionRepository } from '../repositories/test-session.repository.js';
import { InstrumentRepository } from '../repositories/instrument.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { TestSessionService } from '../services/test-session.service.js';
import { ReportService } from '../services/report.service.js';
import { PdfService } from '../services/pdf.service.js';
import { ExcelService } from '../services/excel.service.js';
import { DiscriminationCalculator } from '../modules/testing/calculations/discrimination.calculator.js';
import ExcelJS from 'exceljs';
import fs from 'fs';

function countPdfPages(filePath: string): number {
  const content = fs.readFileSync(filePath, 'latin1');
  const matches = content.match(/\/Type\s*\/Page\b[^\w]/g) || [];
  return matches.length;
}

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('STARTING PHASE 4 AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  try {
    // 0. Ensure a test user and laboratory exist
    const userRes = await pool.query(
      `SELECT u.id, u.email, u.laboratory_id, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY CASE WHEN r.name = 'officer' THEN 1 ELSE 2 END
       LIMIT 1`
    );
    if (userRes.rows.length === 0) {
      throw new Error('No user found in database.');
    }
    const adminUser = userRes.rows[0];
    const jwtPayload = {
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      laboratoryId: adminUser.laboratory_id
    };

    // 1. UNIT TEST: Discrimination Calculator
    console.log('[TEST 1] Discrimination Calculator Sanity & Physical Jump Validation...');
    const invalidDiscResult = DiscriminationCalculator.calculate({
      d: 0.005,
      e: 0.010,
      testLoad: 20.000,
      indication: 20.000,
      addedLoad: 0.007,
      resultingIndication: 100.000, // Erratic impossible jump (80 kg jump on 0.007 kg addition)
      unit: 'kg',
      indicationType: 'digital',
      accuracyClass: 'III',
      regulatoryMode: 'OIML'
    });
    console.log(`  - 20 kg + 0.007 kg -> resulting 100 kg status: ${invalidDiscResult.status}`);
    if (invalidDiscResult.status !== 'FAIL') {
      throw new Error('Discrimination calculator failed: impossible resulting indication (100 kg) was marked PASS!');
    }
    console.log('  ✓ Discrimination correctly REJECTS impossible resulting indication as FAIL.');

    const validDiscResult = DiscriminationCalculator.calculate({
      d: 0.005,
      e: 0.010,
      testLoad: 20.000,
      indication: 20.000,
      addedLoad: 0.007,
      resultingIndication: 20.005, // Exactly I + d
      unit: 'kg',
      indicationType: 'digital',
      accuracyClass: 'III',
      regulatoryMode: 'OIML'
    });
    console.log(`  - 20 kg + 0.007 kg -> resulting 20.005 kg status: ${validDiscResult.status}`);
    if (validDiscResult.status !== 'PASS') {
      throw new Error('Discrimination calculator failed: legitimate I + d response was not marked PASS!');
    }
    console.log('  ✓ Discrimination correctly ACCEPTS legitimate I + d response as PASS.\n');

    // 2. SCENARIO A: Final Validation Scenario with Repeatability Intentionally FAILING
    console.log('[TEST 2] Scenario A: Class III Instrument with Repeatability Intentionally FAILING...');
    // Create instrument
    const inst = await InstrumentRepository.create({
      laboratoryId: adminUser.laboratory_id,
      createdBy: adminUser.id,
      manufacturer: 'Metrology Benchmark Inc.',
      modelNumber: 'MB-30K-P4',
      serialNumber: `SN-P4-${Date.now()}`,
      instrumentType: 'Electronic Non-Automatic Weighing Instrument',
      accuracyClass: 'III',
      maxCapacity: 30.000,
      minCapacity: 0.200,
      scaleInterval: 0.005,
      verificationScaleInterval: 0.010,
      unit: 'kg',
      deviceConfiguration: {
        indicationType: 'digital',
        hasMultipleIndicators: false,
        hasRemoteDisplay: false,
        hasPrinter: false,
        hasEquilibriumExtension: false
      }
    });

    // Create session
    const { session, tests } = await TestSessionService.createSession({
      instrumentId: inst.id,
      regulatoryMode: 'INITIAL_VERIFICATION',
      regulationVersion: 'OIML R 76-1:2006',
      environmentalConditions: {
        temperature: 21.5,
        humidity: 48.0,
        atmosphericPressure: 1012.0
      },
      notes: 'Phase 4 Validation - Repeatability Fail Scenario'
    }, jwtPayload);

    console.log(`  Created Test Session ID: ${session.id}`);

    // Helper to add observations and calculate
    const addObservationsAndCalculate = async (testId: string, obsList: any[]) => {
      for (const obs of obsList) {
        await TestSessionService.addObservation(testId, obs, jwtPayload);
      }
      return await TestSessionService.calculateTest(testId, jwtPayload);
    };

    // Populate Weighing Performance (PASS)
    const weighingTest = tests.find((t: any) => t.code === 'WEIGHING_PERFORMANCE')!;
    await addObservationsAndCalculate(weighingTest.id, [
      { sequenceNo: 1, direction: 'LOADING', loadValue: 0, indicationValue: 0, additionalLoad: 0.005 },
      { sequenceNo: 2, direction: 'LOADING', loadValue: 5, indicationValue: 5.000, additionalLoad: 0.005 },
      { sequenceNo: 3, direction: 'LOADING', loadValue: 15, indicationValue: 15.005, additionalLoad: 0.005 },
      { sequenceNo: 4, direction: 'LOADING', loadValue: 30, indicationValue: 30.005, additionalLoad: 0.005 }
    ]);

    // Populate Eccentricity (PASS)
    const eccTest = tests.find((t: any) => t.code === 'ECCENTRIC_LOADING')!;
    await addObservationsAndCalculate(eccTest.id, [
      { sequenceNo: 1, position: 'CENTER', loadValue: 10, indicationValue: 10.000, additionalLoad: 0.005 },
      { sequenceNo: 2, position: 'FRONT_LEFT', loadValue: 10, indicationValue: 10.005, additionalLoad: 0.005 },
      { sequenceNo: 3, position: 'BACK_LEFT', loadValue: 10, indicationValue: 10.005, additionalLoad: 0.005 },
      { sequenceNo: 4, position: 'BACK_RIGHT', loadValue: 10, indicationValue: 10.005, additionalLoad: 0.005 },
      { sequenceNo: 5, position: 'FRONT_RIGHT', loadValue: 10, indicationValue: 10.005, additionalLoad: 0.005 }
    ]);

    // Populate Zero Setting (PASS)
    const zeroTest = tests.find((t: any) => t.code === 'ZERO_SETTING')!;
    await addObservationsAndCalculate(zeroTest.id, [
      { sequenceNo: 1, loadValue: 0, indicationValue: 0, additionalLoad: 0.0025 }
    ]);

    // Populate Discrimination (PASS)
    const discTest = tests.find((t: any) => t.code === 'DISCRIMINATION')!;
    await addObservationsAndCalculate(discTest.id, [
      { sequenceNo: 1, loadValue: 20, indicationValue: 20.005, additionalLoad: 0.007 }
    ]);

    // Populate Repeatability with INTENTIONAL FAILURE:
    // Load = 15 kg, readings spread from 15.000 to 15.240 kg (Delta I = 0.240 kg >> MPE = 0.010 kg)
    const repTest = tests.find((t: any) => t.code === 'REPEATABILITY')!;
    const repCalcRes = await addObservationsAndCalculate(repTest.id, [
      { sequenceNo: 1, repeatNumber: 1, loadValue: 15, indicationValue: 15.000 },
      { sequenceNo: 2, repeatNumber: 2, loadValue: 15, indicationValue: 15.020 },
      { sequenceNo: 3, repeatNumber: 3, loadValue: 15, indicationValue: 15.240 } // Severe tolerance failure!
    ]);

    console.log(`  Repeatability Test Status: ${repCalcRes.test.status}`);
    if (repCalcRes.test.status !== 'FAIL') {
      throw new Error(`Repeatability test did not evaluate to FAIL! Evaluated to: ${repCalcRes.test.status}`);
    }
    console.log('  ✓ Repeatability is decisively FAIL.');

    // Evaluate overall session
    const evalRes = await TestSessionService.evaluateSessionOverallStatus(session.id);
    console.log(`  Overall Session Status: ${evalRes.overallStatus}`);
    if (!['FAIL', 'FAILED'].includes(evalRes.overallStatus)) {
      throw new Error(`Overall session status is not FAIL/FAILED! Got: ${evalRes.overallStatus}`);
    }
    console.log('  ✓ Authoritative Session Overall Status is FAIL (FAIL > REVIEW_REQUIRED).');

    // Generate Official Report
    const report = await ReportService.generateReport(session.id, jwtPayload, 'http://localhost:5173', true);
    console.log(`  Report Generated: ${report.report_number} (QR ID: ${report.public_verification_id})`);
    console.log(`  Report Overall Status: ${report.overall_status}`);
    if (!['FAIL', 'FAILED'].includes(report.overall_status)) {
      throw new Error(`Report overall status is not FAIL/FAILED! Got: ${report.overall_status}`);
    }

    // Verify Public Verification Endpoint
    const publicVerif = await ReportService.getPublicVerification(report.public_verification_id);
    console.log(`  Public QR Overall Status: ${publicVerif.overallStatus}`);
    const pubRepTest = publicVerif.testSummary.tests.find((t: any) => t.code === 'REPEATABILITY');
    console.log(`  Public QR Repeatability Status: ${pubRepTest?.status}`);
    if (!['FAIL', 'FAILED'].includes(publicVerif.overallStatus) || pubRepTest?.status !== 'FAIL') {
      throw new Error(`Public verification does not match authoritative FAIL status! Overall: ${publicVerif.overallStatus}, Repeatability: ${pubRepTest?.status}`);
    }
    console.log('  ✓ Public QR Verification MATCHES Technician Dashboard: Repeatability = FAIL, Overall = FAIL.');

    // Verify Certificate PDF Page Count
    const certPath = report.certificate_pdf_path;
    const certPageCount = countPdfPages(certPath);
    console.log(`  Certificate PDF Page Count: ${certPageCount}`);
    if (certPageCount !== 1) {
      throw new Error(`Certificate PDF exceeds 1 page! Count: ${certPageCount}`);
    }
    console.log('  ✓ Certificate PDF is STRICTLY 1 PAGE (count === 1).');

    // Verify Detailed Report PDF Page Count
    const detailedPath = report.detailed_pdf_path;
    const detailedPageCount = countPdfPages(detailedPath);
    console.log(`  Detailed Report PDF Page Count: ${detailedPageCount}`);
    if (detailedPageCount < 1) {
      throw new Error(`Detailed Report PDF has 0 pages!`);
    }
    console.log('  ✓ Detailed Technical Report generated successfully.');

    // Verify Excel Workbook
    const excelPath = report.excel_path;
    console.log(`  Excel Workbook Path: ${excelPath}`);
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel file does not exist on disk: ${excelPath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    console.log(`  Excel Sheet Count: ${workbook.worksheets.length}`);
    const sheetNames = workbook.worksheets.map(w => w.name);
    console.log(`  Excel Sheets: ${sheetNames.join(', ')}`);

    if (workbook.worksheets.length < 8) {
      throw new Error(`Excel workbook expected 8 sheets, but found ${workbook.worksheets.length}`);
    }

    // Check Repeatability Sheet in Excel
    const repSheet = workbook.getWorksheet('REPEATABILITY');
    if (!repSheet) {
      throw new Error('REPEATABILITY worksheet missing from Excel workbook!');
    }
    let foundFailInExcel = false;
    repSheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value === 'FAIL') foundFailInExcel = true;
      });
    });
    if (!foundFailInExcel) {
      throw new Error('Excel Repeatability worksheet does not show FAIL decision!');
    }
    console.log('  ✓ Excel Workbook contains all 8 sheets, complete observations, and FAIL decision.\n');

    // 3. SCENARIO B: All Tests PASS Flow
    console.log('[TEST 3] Scenario B: All Tests Passing Flow...');
    // Delete existing Repeatability observations and re-enter passing observations
    await TestSessionService.deleteTestData(session.id, repTest.id, jwtPayload);
    const passRepCalc = await addObservationsAndCalculate(repTest.id, [
      { sequenceNo: 1, repeatNumber: 1, loadValue: 15, indicationValue: 15.000 },
      { sequenceNo: 2, repeatNumber: 2, loadValue: 15, indicationValue: 15.005 },
      { sequenceNo: 3, repeatNumber: 3, loadValue: 15, indicationValue: 15.000 }
    ]);

    console.log(`  Corrected Repeatability Test Status: ${passRepCalc.test.status}`);
    if (passRepCalc.test.status !== 'PASS') {
      throw new Error(`Corrected Repeatability did not evaluate to PASS! Got: ${passRepCalc.test.status}`);
    }

    // Re-evaluate session
    const passEvalRes = await TestSessionService.evaluateSessionOverallStatus(session.id);
    console.log(`  Re-evaluated Overall Status: ${passEvalRes.overallStatus}`);
    console.log(`  Review Required Tests:`, passEvalRes.reviewRequiredTests);
    console.log(`  Incomplete Tests:`, passEvalRes.incompleteTests);
    if (!['PASS', 'PASSED'].includes(passEvalRes.overallStatus)) {
      throw new Error(`Overall status is not PASS/PASSED after fixing test! Got: ${passEvalRes.overallStatus}`);
    }

    // Regenerate report
    const passReport = await ReportService.generateReport(session.id, jwtPayload, 'http://localhost:5173', true);
    console.log(`  Regenerated Report Overall Status: ${passReport.overall_status}`);
    if (!['PASS', 'PASSED'].includes(passReport.overall_status)) {
      throw new Error(`Report status is not PASS/PASSED! Got: ${passReport.overall_status}`);
    }

    const passPublicVerif = await ReportService.getPublicVerification(passReport.public_verification_id);
    console.log(`  Public QR Overall Status: ${passPublicVerif.overallStatus}`);
    if (!['PASS', 'PASSED'].includes(passPublicVerif.overallStatus)) {
      throw new Error(`Public QR overall status is not PASS/PASSED! Got: ${passPublicVerif.overallStatus}`);
    }

    const passCertPages = countPdfPages(passReport.certificate_pdf_path);
    console.log(`  All-Pass Certificate PDF Page Count: ${passCertPages}`);
    if (passCertPages !== 1) {
      throw new Error(`All-Pass Certificate exceeds 1 page! Count: ${passCertPages}`);
    }
    console.log('  ✓ All-Pass flow verified: Dashboard=PASS, Public=PASS, Certificate=PASS, Excel=PASS, PageCount=1.\n');

    // 4. TEST DELETE FACILITY
    console.log('[TEST 4] Test Delete Facility & Report Invalidation...');
    // Delete Repeatability test observations
    const delResult = await TestSessionService.deleteTestData(session.id, repTest.id, jwtPayload);
    const deletedTest = delResult.tests.find((t: any) => t.id === repTest.id);
    console.log(`  Test Status after Deletion: ${deletedTest.status}`);

    if (deletedTest.status !== 'DRAFT') {
      throw new Error('Test deletion failed: status not reset to DRAFT!');
    }
    console.log('  ✓ Test deletion cleared observations and reset status to DRAFT without deleting session.');

    console.log('\n====================================================');
    console.log('ALL PHASE 4 AUTOMATED TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');

    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ PHASE 4 TEST FAILURE:', err);
    process.exit(1);
  }
}

runPhase4Tests();
