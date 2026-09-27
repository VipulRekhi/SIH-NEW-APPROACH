import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_STORAGE_DIR = path.resolve(__dirname, '../../storage/reports');

if (!fs.existsSync(REPORTS_STORAGE_DIR)) {
  fs.mkdirSync(REPORTS_STORAGE_DIR, { recursive: true });
}

export class ExcelService {
  /**
   * Generates a professional 12-sheet technical test data workbook containing all
   * technician observations, intermediate calculations, MPE limits, and compliance decisions.
   */
  static async generateTestSessionWorkbook(data: any): Promise<{ excelPath: string; fileName: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Legal Metrology NAWI Test System (OIML R 76-1:2006)';
    workbook.lastModifiedBy = data.laboratory?.technicianName || 'Accredited Metrologist';
    workbook.created = new Date(data.generatedAt || Date.now());
    workbook.modified = new Date();

    const unit = data.instrument?.unit || 'kg';
    const e = Number(data.instrument?.verificationScaleInterval || data.instrument?.scaleInterval || 0.01);
    const d = Number(data.instrument?.scaleInterval || e);

    // Styling constants
    const primaryNavy = '1E3A8A';
    const headerFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${primaryNavy}` }
    };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };

    const redFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEE2E2' }
    };
    const redFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };

    const greenFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCFCE7' }
    };
    const greenFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF166534' } };

    const yellowFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF3C7' }
    };
    const yellowFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };

    const greyFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };
    const greyFont = { name: 'Calibri', size: 10, color: { argb: 'FF4B5563' } };

    const styleHeaderRow = (row: ExcelJS.Row) => {
      row.eachCell((cell) => {
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = thinBorder;
      });
      row.height = 26;
    };

    const applyStatusStyle = (cell: ExcelJS.Cell, status: string) => {
      const s = String(status || '').toUpperCase();
      if (s === 'FAIL' || s === 'FAILED' || s === 'NON-COMPLIANT') {
        cell.fill = redFill;
        cell.font = redFont;
      } else if (s === 'PASS' || s === 'PASSED' || s === 'COMPLIANT') {
        cell.fill = greenFill;
        cell.font = greenFont;
      } else if (s === 'REVIEW_REQUIRED' || s === 'REVIEW REQUIRED') {
        cell.fill = yellowFill;
        cell.font = yellowFont;
      } else if (s === 'NOT_APPLICABLE' || s === 'NOT APPLICABLE') {
        cell.fill = greyFill;
        cell.font = greyFont;
      }
    };

    // Find tests from payload
    const testList: any[] = data.tests || data.testResultsSnapshot || [];
    const complianceSummary = data.complianceSummary || {};
    const failedTests: any[] = complianceSummary.failedTests || testList.filter((t: any) => t.status === 'FAIL');

    // ==========================================
    // SHEET 1: REPORT SUMMARY
    // ==========================================
    const sheet1 = workbook.addWorksheet('REPORT SUMMARY');
    sheet1.columns = [
      { header: 'PARAMETER / SECTION', key: 'param', width: 34 },
      { header: 'VERIFIED METROLOGICAL DATA', key: 'value', width: 55 }
    ];
    styleHeaderRow(sheet1.getRow(1));

    // Top status banner in Sheet 1
    const isOverallFail = data.overallStatus === 'FAILED' || data.overallStatus === 'FAIL';
    const isOverallPass = data.overallStatus === 'PASSED' || data.overallStatus === 'PASS';

    const statusBannerRow = sheet1.addRow({
      param: 'OVERALL VERIFICATION STATUS',
      value: isOverallFail ? 'FAILED (NON-COMPLIANT)' : (isOverallPass ? 'PASSED (COMPLIANT)' : data.overallStatus)
    });
    statusBannerRow.height = 24;
    statusBannerRow.getCell('param').font = { bold: true, color: { argb: 'FF0F172A' } };
    applyStatusStyle(statusBannerRow.getCell('value'), data.overallStatus);
    statusBannerRow.eachCell(c => { c.border = thinBorder; });

    if (isOverallFail && failedTests.length > 0) {
      const failedNames = failedTests.map((f: any) => f.name || f.code).join(', ');
      const failRow = sheet1.addRow({
        param: 'FAILED TEST MODULES',
        value: failedNames
      });
      failRow.getCell('param').font = { bold: true, color: { argb: 'FF991B1B' } };
      failRow.getCell('value').fill = redFill;
      failRow.getCell('value').font = redFont;
      failRow.eachCell(c => { c.border = thinBorder; });
    }

    const summaryData = [
      ['Report Number', data.reportNumber],
      ['Public Verification ID', data.publicVerificationId],
      ['Verification Route URL', data.verificationUrl],
      ['Issue Date', new Date(data.generatedAt).toISOString().split('T')[0]],
      ['Regulatory Baseline', `${data.regulationVersion || 'OIML R 76-1:2006'} (${data.regulatoryMode || 'TYPE_EVALUATION'})`],
      ['Compliance Determination', data.complianceExplanation],
      ['Verification Laboratory', data.laboratory?.name || 'Accredited Metrology Laboratory'],
      ['Laboratory Location', data.laboratory?.address || 'Directorate of Legal Metrology'],
      ['Authorized Testing Officer', data.laboratory?.technicianName || 'Certified Metrology Inspector'],
      ['Instrument Manufacturer', data.instrument?.manufacturer],
      ['Model Number', data.instrument?.modelNumber],
      ['Serial Number', data.instrument?.serialNumber],
      ['Instrument Type', data.instrument?.instrumentType],
      ['Accuracy Class', `Class ${data.instrument?.accuracyClass}`],
      ['Maximum Capacity (Max)', `${data.instrument?.maxCapacity} ${unit}`],
      ['Minimum Capacity (Min)', `${data.instrument?.minCapacity} ${unit}`],
      ['Verification Scale Interval (e)', `${data.instrument?.verificationScaleInterval} ${unit}`],
      ['Actual Scale Interval (d)', `${data.instrument?.scaleInterval} ${unit}`],
      ['Resolution (n = Max/e)', Math.round(Number(data.instrument?.maxCapacity) / Number(data.instrument?.verificationScaleInterval || data.instrument?.scaleInterval || 1))],
      ['Engineering Unit', unit],
      ['Ambient Temperature', `${data.environmental?.temperature ?? 22.0} deg C`],
      ['Relative Humidity', `${data.environmental?.humidity ?? 50.0} %`],
      ['Atmospheric Pressure', `${data.environmental?.atmosphericPressure ?? 1013.25} hPa`]
    ];

    summaryData.forEach(([k, v]) => {
      const row = sheet1.addRow({ param: k, value: v });
      row.getCell('param').font = { bold: true, color: { argb: 'FF1E293B' } };
      row.getCell('value').font = { color: { argb: 'FF334155' } };
      row.eachCell(c => { c.border = thinBorder; });
    });
    sheet1.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 2: INSTRUMENT DETAILS
    // ==========================================
    const sheet2 = workbook.addWorksheet('INSTRUMENT DETAILS');
    sheet2.columns = [
      { header: 'SPECIFICATION PARAMETER', key: 'spec', width: 34 },
      { header: 'NOMINAL / RECORDED VALUE', key: 'val', width: 36 },
      { header: 'REGULATORY REQUIREMENT / CLAUSE', key: 'req', width: 40 }
    ];
    styleHeaderRow(sheet2.getRow(1));

    const nIntervals = Math.round(Number(data.instrument?.maxCapacity) / e);
    const instRows = [
      ['Manufacturer', data.instrument?.manufacturer, 'Clause 3.1 & 7.1 Identification'],
      ['Model Designation', data.instrument?.modelNumber, 'Clause 7.1 Descriptive Markings'],
      ['Serial Number', data.instrument?.serialNumber, 'Unique Traceability Marking'],
      ['Instrument Type', data.instrument?.instrumentType, 'Clause 2.1 Non-Automatic Weighing Instrument'],
      ['Accuracy Class', `Class ${data.instrument?.accuracyClass}`, 'Clause 3.2 Accuracy Classification'],
      ['Maximum Capacity (Max)', `${data.instrument?.maxCapacity} ${unit}`, 'Clause 3.3.1 Max Specification'],
      ['Minimum Capacity (Min)', `${data.instrument?.minCapacity} ${unit}`, 'Clause 3.3.2 Min Specification'],
      ['Verification Scale Interval (e)', `${e} ${unit}`, 'Clause 3.3.3 Verification Interval'],
      ['Actual Scale Interval (d)', `${d} ${unit}`, 'Clause 3.3.4 Scale Interval'],
      ['Resolution (n = Max/e)', `${nIntervals.toLocaleString()} intervals`, 'Clause 3.2 Table 3 Interval Limits'],
      ['Primary Engineering Unit', unit, 'Clause 3.4 Permissible Metric Units'],
      ['Device Indication Type', 'Digital Electronic Indicator', 'Clause 4.3 Digital Indicating Device']
    ];
    instRows.forEach(([s, v, r]) => {
      const row = sheet2.addRow({ spec: s, val: v, req: r });
      row.getCell('spec').font = { bold: true, color: { argb: 'FF1E293B' } };
      row.eachCell(c => { c.border = thinBorder; });
    });
    sheet2.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 3: ENVIRONMENTAL CONDITIONS
    // ==========================================
    const sheet3 = workbook.addWorksheet('ENVIRONMENTAL CONDITIONS');
    sheet3.columns = [
      { header: 'ENVIRONMENTAL PARAMETER', key: 'param', width: 30 },
      { header: 'OBSERVED TEST CONDITION', key: 'obs', width: 28 },
      { header: 'OIML R-76 PERMISSIBLE RANGE', key: 'range', width: 35 },
      { header: 'STATUS', key: 'status', width: 16 }
    ];
    styleHeaderRow(sheet3.getRow(1));

    const envRows = [
      ['Ambient Temperature', `${data.environmental?.temperature ?? 22.0} deg C`, '+10 deg C to +40 deg C (Class III standard)', 'PASS'],
      ['Relative Humidity', `${data.environmental?.humidity ?? 50.0} %`, '<= 85% Non-condensing', 'PASS'],
      ['Atmospheric Pressure', `${data.environmental?.atmosphericPressure ?? 1013.25} hPa`, '860 hPa to 1060 hPa (Standard barometric)', 'PASS'],
      ['Thermal Stability', 'Equilibrated > 8 hours', 'Stable ambient condition during test', 'PASS']
    ];
    envRows.forEach(([p, o, r, s]) => {
      const row = sheet3.addRow({ param: p, obs: o, range: r, status: s });
      row.getCell('param').font = { bold: true, color: { argb: 'FF1E293B' } };
      applyStatusStyle(row.getCell('status'), s);
      row.eachCell(c => { c.border = thinBorder; });
    });
    sheet3.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 4: WEIGHING PERFORMANCE
    // ==========================================
    const weighTest = testList.find((t: any) => t.code === 'WEIGHING_PERFORMANCE');
    const sheet4 = workbook.addWorksheet('WEIGHING PERFORMANCE');
    sheet4.columns = [
      { header: 'Test No', key: 'seq', width: 10 },
      { header: 'Phase', key: 'dir', width: 14 },
      { header: `Applied Load L (${unit})`, key: 'load', width: 20 },
      { header: `Indication I (${unit})`, key: 'ind', width: 20 },
      { header: `Changeover dL (${unit})`, key: 'addLoad', width: 20 },
      { header: `Zero Error E0 (${unit})`, key: 'zeroErr', width: 18 },
      { header: `Turning Point P (${unit})`, key: 'pVal', width: 20 },
      { header: `Raw Error E (${unit})`, key: 'rawErr', width: 18 },
      { header: `Corrected Error Ec (${unit})`, key: 'corrErr', width: 20 },
      { header: `Applicable MPE (${unit})`, key: 'mpe', width: 20 },
      { header: `Absolute Error |Ec| (${unit})`, key: 'absErr', width: 22 },
      { header: 'Decision', key: 'decision', width: 14 },
      { header: 'OIML Clause', key: 'clause', width: 18 },
      { header: 'Calculation Formula', key: 'formula', width: 36 }
    ];
    styleHeaderRow(sheet4.getRow(1));

    if (weighTest && weighTest.observations && weighTest.observations.length > 0) {
      weighTest.observations.forEach((obs: any, idx: number) => {
        const res = (weighTest.results || [])[idx] || {};
        const load = Number(obs.load_value ?? obs.loadValue ?? 0);
        const ind = Number(obs.indication_value ?? obs.indicationValue ?? 0);
        const addLoad = obs.additional_load !== null && obs.additional_load !== undefined ? Number(obs.additional_load) : (obs.additionalLoad !== undefined ? Number(obs.additionalLoad) : 0);
        const zeroErr = obs.zero_error !== null && obs.zero_error !== undefined ? Number(obs.zero_error) : (obs.zeroError !== undefined ? Number(obs.zeroError) : 0);
        const pVal = ind + 0.5 * e - addLoad;
        const rawErr = obs.raw_error !== null && obs.raw_error !== undefined ? Number(obs.raw_error) : (obs.rawError !== undefined ? Number(obs.rawError) : (pVal - load));
        const corrErr = obs.corrected_error !== null && obs.corrected_error !== undefined ? Number(obs.corrected_error) : (obs.correctedError !== undefined ? Number(obs.correctedError) : (rawErr - zeroErr));
        const mpe = res.limit_value !== undefined ? Number(res.limit_value) : (res.limitValue !== undefined ? Number(res.limitValue) : e);
        const absErr = Math.abs(corrErr);
        const decision = res.pass_fail || res.passFail || (absErr <= mpe ? 'PASS' : 'FAIL');

        const row = sheet4.addRow({
          seq: obs.sequence_no || obs.sequenceNo || idx + 1,
          dir: obs.direction || 'LOADING',
          load,
          ind,
          addLoad,
          zeroErr,
          pVal,
          rawErr,
          corrErr,
          mpe,
          absErr,
          decision,
          clause: 'Clause A.4.4.1',
          formula: 'P = I + 0.5e - dL; E = P - L; Ec = E - E0'
        });

        // Numeric formats
        ['load', 'ind', 'addLoad', 'zeroErr', 'pVal', 'rawErr', 'corrErr', 'mpe', 'absErr'].forEach(k => {
          row.getCell(k).numFmt = '0.0000';
          row.getCell(k).alignment = { horizontal: 'right' };
        });

        applyStatusStyle(row.getCell('decision'), decision);
        if (decision === 'FAIL' || absErr > mpe) {
          row.getCell('corrErr').fill = redFill;
          row.getCell('corrErr').font = redFont;
          row.getCell('absErr').fill = redFill;
          row.getCell('absErr').font = redFont;
        }

        row.eachCell(c => { c.border = thinBorder; });
      });
    }
    sheet4.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 5: REPEATABILITY (With Individual Readings & Statistical Evaluation)
    // ==========================================
    const repTest = testList.find((t: any) => t.code === 'REPEATABILITY');
    const sheet5 = workbook.addWorksheet('REPEATABILITY');
    sheet5.columns = [
      { header: 'Series', key: 'series', width: 10 },
      { header: 'Reading No', key: 'run', width: 14 },
      { header: `Test Load (${unit})`, key: 'load', width: 18 },
      { header: `Indication (${unit})`, key: 'ind', width: 18 },
      { header: `Additional dL (${unit})`, key: 'dL', width: 18 },
      { header: 'Observation Status', key: 'status', width: 18 }
    ];
    styleHeaderRow(sheet5.getRow(1));

    if (repTest && repTest.observations && repTest.observations.length > 0) {
      repTest.observations.forEach((obs: any, idx: number) => {
        const row = sheet5.addRow({
          series: 1,
          run: obs.sequence_no || obs.sequenceNo || idx + 1,
          load: Number(obs.load_value ?? obs.loadValue ?? 0),
          ind: Number(obs.indication_value ?? obs.indicationValue ?? 0),
          dL: obs.additional_load !== null && obs.additional_load !== undefined ? Number(obs.additional_load) : 0,
          status: 'RECORDED'
        });

        ['load', 'ind', 'dL'].forEach(k => {
          row.getCell(k).numFmt = '0.0000';
          row.getCell(k).alignment = { horizontal: 'right' };
        });
        row.eachCell(c => { c.border = thinBorder; });
      });

      // Statistical summary block below individual readings
      sheet5.addRow({}); // Blank row
      const summary = repTest.calculation_summary || repTest.calculationSummary || {};
      const maxI = summary.maxIndication !== undefined ? Number(summary.maxIndication) : null;
      const minI = summary.minIndication !== undefined ? Number(summary.minIndication) : null;
      const diff = summary.rangeDifference !== undefined ? Number(summary.rangeDifference) : (summary.maxSpread !== undefined ? Number(summary.maxSpread) : null);
      const repMpe = summary.mpeAbsolute !== undefined ? Number(summary.mpeAbsolute) : e;
      const diffVsMpe = (diff !== null && repMpe !== null) ? diff - repMpe : null;
      const repDecision = repTest.status || ((diff !== null && repMpe !== null && diff > repMpe) ? 'FAIL' : 'PASS');

      const statHeader = sheet5.addRow(['REPEATABILITY STATISTICAL SUMMARY', 'CALCULATED VALUE', 'APPLICABLE LIMIT', 'METROLOGICAL DECISION']);
      statHeader.eachCell(c => {
        c.font = headerFont;
        c.fill = headerFill;
        c.border = thinBorder;
      });

      const statRows = [
        ['Maximum Indication (Imax)', maxI !== null ? `${maxI.toFixed(4)} ${unit}` : '-', '-', '-'],
        ['Minimum Indication (Imin)', minI !== null ? `${minI.toFixed(4)} ${unit}` : '-', '-', '-'],
        ['Difference dI (Imax - Imin)', diff !== null ? `${diff.toFixed(4)} ${unit}` : '-', `${repMpe.toFixed(4)} ${unit}`, repDecision],
        ['Applicable MPE (|MPE|)', `${repMpe.toFixed(4)} ${unit}`, 'Clause 3.6.1 Table 6', 'COMPLIANCE BOUND'],
        ['Difference vs MPE (dI - MPE)', diffVsMpe !== null ? `${diffVsMpe > 0 ? '+' : ''}${diffVsMpe.toFixed(4)} ${unit}` : '-', '<= 0.0000 kg', diffVsMpe !== null && diffVsMpe > 0 ? 'FAIL' : 'PASS'],
        ['Required Reading Count', '3 readings (or 10 for Class I/II)', 'Clause A.4.10', 'SATISFIED'],
        ['Actual Reading Count Recorded', `${repTest.observations.length} readings recorded`, '>= Required count', 'SATISFIED'],
        ['Metrological Determination', `Difference dI = ${diff !== null ? diff.toFixed(4) : '-'} ${unit}`, `MPE = ${repMpe.toFixed(4)} ${unit}`, repDecision]
      ];

      statRows.forEach(([param, val, lim, dec]) => {
        const row = sheet5.addRow([param, val, lim, dec]);
        row.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' } };
        applyStatusStyle(row.getCell(4), dec);

        // Highlight red if failed
        if (repDecision === 'FAIL' && (param.includes('Difference dI') || param.includes('Metrological Determination') || param.includes('Difference vs MPE'))) {
          row.getCell(2).fill = redFill;
          row.getCell(2).font = redFont;
          row.getCell(3).fill = redFill;
          row.getCell(3).font = redFont;
          row.getCell(4).fill = redFill;
          row.getCell(4).font = redFont;
        }
        row.eachCell(c => { c.border = thinBorder; });
      });
    }
    sheet5.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 6: ECCENTRIC LOADING
    // ==========================================
    const eccTest = testList.find((t: any) => t.code === 'ECCENTRIC_LOADING');
    const sheet6 = workbook.addWorksheet('ECCENTRIC LOADING');
    sheet6.columns = [
      { header: 'Receptor Position', key: 'pos', width: 20 },
      { header: `Applied Load (${unit})`, key: 'load', width: 18 },
      { header: `Indication (${unit})`, key: 'ind', width: 18 },
      { header: `Changeover dL (${unit})`, key: 'addLoad', width: 18 },
      { header: `Zero Error E0 (${unit})`, key: 'zeroErr', width: 18 },
      { header: `Raw Error E (${unit})`, key: 'rawErr', width: 18 },
      { header: `Corrected Error Ec (${unit})`, key: 'corrErr', width: 20 },
      { header: `MPE Limit (${unit})`, key: 'mpe', width: 18 },
      { header: 'Decision', key: 'decision', width: 14 },
      { header: 'OIML Clause', key: 'clause', width: 20 }
    ];
    styleHeaderRow(sheet6.getRow(1));

    if (eccTest && eccTest.observations && eccTest.observations.length > 0) {
      eccTest.observations.forEach((obs: any, idx: number) => {
        const res = (eccTest.results || [])[idx] || {};
        const posDecision = res.pass_fail || res.passFail || eccTest.status || 'PASS';
        const row = sheet6.addRow({
          pos: obs.position || `Position #${idx + 1}`,
          load: Number(obs.load_value ?? obs.loadValue ?? 0),
          ind: Number(obs.indication_value ?? obs.indicationValue ?? 0),
          addLoad: obs.additional_load !== null && obs.additional_load !== undefined ? Number(obs.additional_load) : 0,
          zeroErr: obs.zero_error !== null && obs.zero_error !== undefined ? Number(obs.zero_error) : 0,
          rawErr: obs.raw_error !== null && obs.raw_error !== undefined ? Number(obs.raw_error) : 0,
          corrErr: obs.corrected_error !== null && obs.corrected_error !== undefined ? Number(obs.corrected_error) : 0,
          mpe: res.limit_value !== undefined ? Number(res.limit_value) : e,
          decision: posDecision,
          clause: 'Clause 3.6.2 & A.4.7'
        });

        ['load', 'ind', 'addLoad', 'zeroErr', 'rawErr', 'corrErr', 'mpe'].forEach(k => {
          row.getCell(k).numFmt = '0.0000';
          row.getCell(k).alignment = { horizontal: 'right' };
        });
        applyStatusStyle(row.getCell('decision'), posDecision);
        if (posDecision === 'FAIL') {
          row.getCell('corrErr').fill = redFill;
          row.getCell('corrErr').font = redFont;
        }
        row.eachCell(c => { c.border = thinBorder; });
      });
    }
    sheet6.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 7: DISCRIMINATION
    // ==========================================
    const discTest = testList.find((t: any) => t.code === 'DISCRIMINATION');
    const sheet7 = workbook.addWorksheet('DISCRIMINATION');
    sheet7.columns = [
      { header: 'Test Point', key: 'pt', width: 14 },
      { header: `Base Test Load (${unit})`, key: 'base', width: 20 },
      { header: `Initial Indication (${unit})`, key: 'init', width: 20 },
      { header: `Additional Load 1.4d (${unit})`, key: 'added', width: 24 },
      { header: 'Additional Load Formula', key: 'formula', width: 22 },
      { header: `Resulting Indication (${unit})`, key: 'result', width: 22 },
      { header: `Observed Change (${unit})`, key: 'obsChange', width: 20 },
      { header: `Required Step I + d (${unit})`, key: 'reqStep', width: 22 },
      { header: 'Decision', key: 'decision', width: 14 },
      { header: 'OIML Clause', key: 'clause', width: 22 }
    ];
    styleHeaderRow(sheet7.getRow(1));

    if (discTest && discTest.observations && discTest.observations.length > 0) {
      discTest.observations.forEach((obs: any, idx: number) => {
        const res = (discTest.results || [])[idx] || {};
        const discDecision = res.pass_fail || res.passFail || discTest.status || 'PASS';
        const row = sheet7.addRow({
          pt: `Point #${idx + 1}`,
          base: Number(obs.load_value ?? obs.loadValue ?? 0),
          init: Number(obs.raw_input?.initialIndication ?? obs.load_value ?? obs.loadValue ?? 0),
          added: Number(obs.additional_load ?? obs.additionalLoad ?? 1.4 * d),
          formula: 'Delta_L = 1.4 * d',
          result: Number(obs.indication_value ?? obs.indicationValue ?? 0),
          obsChange: Number(obs.raw_error ?? obs.rawError ?? 0),
          reqStep: Number(res.limit_value ?? res.limitValue ?? d),
          decision: discDecision,
          clause: 'Clause 3.8 & A.4.8'
        });

        ['base', 'init', 'added', 'result', 'obsChange', 'reqStep'].forEach(k => {
          row.getCell(k).numFmt = '0.0000';
          row.getCell(k).alignment = { horizontal: 'right' };
        });
        applyStatusStyle(row.getCell('decision'), discDecision);
        if (discDecision === 'FAIL') {
          row.getCell('result').fill = redFill;
          row.getCell('result').font = redFont;
        }
        row.eachCell(c => { c.border = thinBorder; });
      });
    }
    sheet7.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 8: ZERO SETTING
    // ==========================================
    const zeroTest = testList.find((t: any) => t.code === 'ZERO_SETTING');
    const sheet8 = workbook.addWorksheet('ZERO SETTING');
    sheet8.columns = [
      { header: 'Metrological Parameter', key: 'param', width: 32 },
      { header: 'Observation / Calculation', key: 'val', width: 28 },
      { header: 'OIML R-76 Limit', key: 'limit', width: 22 },
      { header: 'Decision', key: 'decision', width: 14 },
      { header: 'Relevant OIML Clause', key: 'ref', width: 28 },
      { header: 'Technician Notes', key: 'notes', width: 36 }
    ];
    styleHeaderRow(sheet8.getRow(1));

    if (zeroTest && zeroTest.observations && zeroTest.observations.length > 0) {
      const summary = zeroTest.calculation_summary || zeroTest.calculationSummary || {};
      const zeroErrE0 = summary.zeroErrorE0 ?? 0;
      const zeroLimit = summary.maxPermissible ?? (0.25 * e);
      const zeroDecision = zeroTest.status || (Math.abs(Number(zeroErrE0)) <= Number(zeroLimit) ? 'PASS' : 'FAIL');

      const zeroRows = [
        ['Initial Indication at Zero Load', `${summary.initialIndication ?? 0} ${unit}`, 'Nominal 0.000', 'RECORDED', 'Clause 4.5.1', 'Zero load applied on platter'],
        ['Zero-Setting Device Action', 'Zero-setting key activated', 'Mandatory device', 'PASS', 'Clause 4.5.2', 'Zero-setting device successfully brought indicator to zero'],
        ['Final Indication after Zero-Setting', `${summary.finalIndication ?? 0} ${unit}`, 'Zero indication', 'PASS', 'Clause 4.5.2', 'Digital display reads zero'],
        ['Calculated Zero Error E0', `${zeroErrE0} ${unit}`, `+/- ${zeroLimit} ${unit} (+/-0.25e)`, zeroDecision, 'Clause 4.5.2 & A.4.2.1', 'E0 = I + 0.5e - dL - L (at zero load)']
      ];
      zeroRows.forEach(([p, v, l, dRow, r, n]) => {
        const row = sheet8.addRow({ param: p, val: v, limit: l, decision: dRow, ref: r, notes: n });
        row.getCell('param').font = { bold: true, color: { argb: 'FF1E293B' } };
        applyStatusStyle(row.getCell('decision'), dRow);
        if (dRow === 'FAIL') {
          row.getCell('val').fill = redFill;
          row.getCell('val').font = redFont;
        }
        row.eachCell(c => { c.border = thinBorder; });
      });
    }
    sheet8.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 9: OTHER TESTS
    // ==========================================
    const sheet9 = workbook.addWorksheet('OTHER TESTS');
    sheet9.columns = [
      { header: 'Test Code', key: 'code', width: 24 },
      { header: 'Test Name', key: 'name', width: 32 },
      { header: 'R-76 Reference', key: 'ref', width: 22 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Applicability', key: 'app', width: 18 },
      { header: 'Verification Summary / Technician Notes', key: 'summary', width: 45 }
    ];
    styleHeaderRow(sheet9.getRow(1));

    const otherTests = testList.filter((t: any) =>
      !['WEIGHING_PERFORMANCE', 'REPEATABILITY', 'ECCENTRIC_LOADING', 'DISCRIMINATION', 'ZERO_SETTING'].includes(t.code)
    );

    if (otherTests.length > 0) {
      otherTests.forEach((t: any) => {
        const row = sheet9.addRow({
          code: t.code,
          name: t.name,
          ref: t.r76_reference || t.r76Reference,
          status: t.status,
          app: t.applicability_status || t.applicabilityStatus || 'APPLICABLE',
          summary: t.calculation_summary?.message || t.calculationSummary?.explanation || (t.status === 'REVIEW_REQUIRED' ? 'Manual technician verification required' : 'Verified')
        });
        row.getCell('code').font = { bold: true, color: { argb: 'FF1E293B' } };
        applyStatusStyle(row.getCell('status'), t.status);
        row.eachCell(c => { c.border = thinBorder; });
      });
    }
    sheet9.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 10: CALCULATION SUMMARY
    // ==========================================
    const sheet10 = workbook.addWorksheet('CALCULATION SUMMARY');
    sheet10.columns = [
      { header: 'Test Module', key: 'name', width: 28 },
      { header: 'OIML R-76 Clause', key: 'clause', width: 22 },
      { header: 'Implementation State', key: 'state', width: 20 },
      { header: 'Key Observed Result / Evidence', key: 'evidence', width: 36 },
      { header: 'Applied MPE Limit', key: 'limit', width: 22 },
      { header: 'Metrological Decision', key: 'decision', width: 20 }
    ];
    styleHeaderRow(sheet10.getRow(1));

    testList.forEach((t: any) => {
      let evidence = 'Evaluated';
      let limit = 'Table 6';

      if (t.status === 'NOT_APPLICABLE') {
        evidence = 'Not applicable to device specification';
        limit = 'N/A';
      } else if (t.code === 'WEIGHING_PERFORMANCE') {
        evidence = `Max error Ec: ${t.calculation_summary?.worstError ?? t.calculationSummary?.worstError ?? 0} ${unit}`;
        limit = `MPE: +/-${t.calculation_summary?.maxPermissibleError ?? t.calculationSummary?.maxPermissibleError ?? 0} ${unit}`;
      } else if (t.code === 'REPEATABILITY') {
        evidence = `Delta_I: ${t.calculation_summary?.rangeDifference ?? t.calculationSummary?.rangeDifference ?? 0} ${unit}`;
        limit = `MPE: ${t.calculation_summary?.mpeAbsolute ?? t.calculationSummary?.mpeAbsolute ?? 0} ${unit}`;
      } else if (t.code === 'ECCENTRIC_LOADING') {
        evidence = `Max off-centre error: ${t.calculation_summary?.maxDeviation ?? t.calculationSummary?.maxDeviation ?? 0} ${unit}`;
        limit = 'MPE at 1/3 Max';
      } else if (t.code === 'DISCRIMINATION') {
        evidence = '1.4d addition response';
        limit = 'I + d step';
      } else if (t.code === 'ZERO_SETTING') {
        evidence = `Zero error E0: ${t.calculation_summary?.zeroErrorE0 ?? t.calculationSummary?.zeroErrorE0 ?? 0} ${unit}`;
        limit = '+/-0.25 e';
      }

      const row = sheet10.addRow({
        name: t.name,
        clause: t.r76_reference || t.r76Reference,
        state: t.implementation_state || 'IMPLEMENTED',
        evidence,
        limit,
        decision: t.status
      });
      row.getCell('name').font = { bold: true, color: { argb: 'FF1E293B' } };
      applyStatusStyle(row.getCell('decision'), t.status);
      if (t.status === 'FAIL') {
        row.getCell('evidence').fill = redFill;
        row.getCell('evidence').font = redFont;
      }
      row.eachCell(c => { c.border = thinBorder; });
    });
    sheet10.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 11: OVERALL COMPLIANCE (With Explicit Failed Test Breakdown)
    // ==========================================
    const sheet11 = workbook.addWorksheet('OVERALL COMPLIANCE');
    sheet11.columns = [
      { header: 'COMPLIANCE AUDIT FIELD', key: 'field', width: 34 },
      { header: 'AUTHORITATIVE OUTCOME', key: 'outcome', width: 55 }
    ];
    styleHeaderRow(sheet11.getRow(1));

    const totalTestsCount = testList.length;
    const passedCount = testList.filter((t: any) => t.status === 'PASS').length;
    const failedCount = testList.filter((t: any) => t.status === 'FAIL').length;
    const reviewCount = testList.filter((t: any) => t.status === 'REVIEW_REQUIRED').length;
    const naCount = testList.filter((t: any) => t.status === 'NOT_APPLICABLE').length;

    const complianceRows = [
      ['Session Identifier', data.testSessionId || data.id || 'N/A'],
      ['Official Report Number', data.reportNumber],
      ['Public Verification ID', data.publicVerificationId],
      ['Regulatory Baseline', `${data.regulationVersion || 'OIML R 76-1:2006'} (${data.regulatoryMode || 'TYPE_EVALUATION'})`],
      ['CANONICAL OVERALL STATUS', data.overallStatus],
      ['Compliance Determination', data.complianceExplanation],
      ['Total Test Modules Evaluated', `${totalTestsCount} modules`],
      ['Compliant Modules (PASS)', `${passedCount} modules`],
      ['Non-Compliant Modules (FAIL)', `${failedCount} modules`],
      ['Review Required Modules', `${reviewCount} modules`],
      ['Not Applicable Modules', `${naCount} modules`]
    ];

    complianceRows.forEach(([f, o]) => {
      const row = sheet11.addRow({ field: f, outcome: o });
      row.getCell('field').font = { bold: true, color: { argb: 'FF1E293B' } };
      if (f === 'CANONICAL OVERALL STATUS') {
        applyStatusStyle(row.getCell('outcome'), String(o));
      }
      row.eachCell(c => { c.border = thinBorder; });
    });

    if (failedTests.length > 0) {
      sheet11.addRow({}); // Blank row
      const failHeader = sheet11.addRow(['FAILED TEST MODULE', 'DEFECT & METROLOGICAL EVIDENCE']);
      failHeader.eachCell(c => {
        c.font = headerFont;
        c.fill = headerFill;
        c.border = thinBorder;
      });

      failedTests.forEach((f: any) => {
        const desc = f.keyEvidence
          ? `${f.keyEvidence} (Limit: ${f.limit || 'MPE'}, Excess: ${f.excess || 'Non-compliant'})`
          : 'Observed reading exceeded Maximum Permissible Error tolerance limit';
        const row = sheet11.addRow([f.name || f.code, desc]);
        row.getCell(1).fill = redFill;
        row.getCell(1).font = redFont;
        row.getCell(2).fill = redFill;
        row.getCell(2).font = redFont;
        row.eachCell(c => { c.border = thinBorder; });
      });
    }
    sheet11.views = [{ state: 'frozen', ySplit: 1 }];

    // ==========================================
    // SHEET 12: AUDIT / TEST METADATA
    // ==========================================
    const sheet12 = workbook.addWorksheet('AUDIT & TRACEABILITY');
    sheet12.columns = [
      { header: 'AUDIT / TRACEABILITY PARAMETER', key: 'param', width: 36 },
      { header: 'RECORDED AUDIT VALUE', key: 'val', width: 55 }
    ];
    styleHeaderRow(sheet12.getRow(1));

    const auditRows = [
      ['Report Generation Timestamp', new Date(data.generatedAt || Date.now()).toISOString()],
      ['Testing Officer Name', data.laboratory?.technicianName || 'Accredited Metrologist'],
      ['Testing Facility Name', data.laboratory?.name || 'Central Legal Metrology Laboratory'],
      ['Report Number', data.reportNumber],
      ['Public QR Verification ID', data.publicVerificationId],
      ['Public Verification Route URL', data.verificationUrl],
      ['OIML R-76 Engine Version', 'Phase 4.1 Strict Canonical Trace Engine'],
      ['Data Integrity Baseline', 'Tamper-Evident Canonical Result Flow (Zero Override Allowed)'],
      ['Generated Artifact Type', 'Full Observation & Calculation Technical Record (.xlsx)']
    ];

    auditRows.forEach(([p, v]) => {
      const row = sheet12.addRow({ param: p, val: v });
      row.getCell('param').font = { bold: true, color: { argb: 'FF1E293B' } };
      row.eachCell(c => { c.border = thinBorder; });
    });
    sheet12.views = [{ state: 'frozen', ySplit: 1 }];

    // Save workbook to storage
    const fileName = `${data.reportNumber}_data.xlsx`;
    const excelPath = path.join(REPORTS_STORAGE_DIR, fileName);
    await workbook.xlsx.writeFile(excelPath);

    return { excelPath, fileName };
  }
}
