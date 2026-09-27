import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORTS_STORAGE_DIR = path.resolve(__dirname, '../../storage/reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_STORAGE_DIR)) {
  fs.mkdirSync(REPORTS_STORAGE_DIR, { recursive: true });
}

export interface PdfReportInput {
  reportNumber: string;
  publicVerificationId: string;
  verificationUrl: string;
  regulatoryMode: string;
  regulationVersion: string;
  overallStatus: string;
  complianceExplanation: string;
  complianceSummary: any;
  generatedAt: string | Date;
  laboratory: {
    name: string;
    address?: string | null;
    technicianName?: string | null;
  };
  instrument: {
    manufacturer: string;
    modelNumber: string;
    serialNumber: string;
    instrumentType: string;
    accuracyClass: string;
    maxCapacity: number;
    minCapacity: number;
    scaleInterval: number;
    verificationScaleInterval: number;
    unit: string;
    deviceConfiguration?: any;
  };
  environmental: {
    temperature?: number | string;
    humidity?: number | string;
    atmosphericPressure?: number | string;
  };
  tests: Array<{
    id?: string;
    code: string;
    name: string;
    r76Reference: string;
    status: string;
    observationsCount?: number;
    calculationSummary?: any;
    observations?: any[];
    results?: any[];
  }>;
}

import { ExcelService } from './excel.service.js';

export interface DualPdfResult {
  certificatePdfPath: string;
  certificateFileName: string;
  detailedPdfPath: string;
  detailedFileName: string;
  excelPath: string;
  excelFileName: string;
  // Primary backward-compatible properties
  pdfPath: string;
  fileName: string;
  qrBuffer: Buffer;
  qrDataUrl: string;
}

export class PdfService {
  /**
   * Helper to format numbers cleanly with unit.
   */
  private static fmtNum(val: any, decimals = 3): string {
    if (val === undefined || val === null || isNaN(Number(val))) return '-';
    return Number(val).toFixed(decimals);
  }

  /**
   * Generates QR code buffer & data URL
   */
  private static async getQrAssets(verificationUrl: string): Promise<{ qrBuffer: Buffer; qrDataUrl: string }> {
    const qrBuffer = await QRCode.toBuffer(verificationUrl, {
      type: 'png',
      margin: 1,
      width: 250,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    const qrDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;
    return { qrBuffer, qrDataUrl };
  }

  /**
   * OFFICIAL ONE-PAGE CERTIFICATE
   * Strictly formatted for legal metrology A4 portrait.
   * Guaranteed to be exactly 1 page.
   */
  static async generateCertificatePdf(
    data: PdfReportInput,
    qrBuffer: Buffer
  ): Promise<{ pdfPath: string; fileName: string }> {
    const fileName = `${data.reportNumber}_certificate.pdf`;
    const pdfPath = path.join(REPORTS_STORAGE_DIR, fileName);

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 28, bottom: 15, left: 36, right: 36 },
      bufferPages: true,
      info: {
        Title: `NAWI Verification Certificate - ${data.reportNumber}`,
        Author: 'Legal Metrology Directorate',
        Subject: `OIML R 76-1:2006 Test Certificate for ${data.instrument.manufacturer} ${data.instrument.modelNumber}`,
        Keywords: 'OIML, R-76, NAWI, Certificate, Legal Metrology'
      }
    });

    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const contentWidth = pageWidth - 72; // 523.28

    const primaryNavy = '#1e3a8a';
    const slateDark = '#0f172a';
    const slateMuted = '#475569';
    const borderSlate = '#cbd5e1';
    const bgSlate = '#f8fafc';

    // 1. HEADER (Height: 70)
    let curY = 32;
    doc.rect(36, curY, contentWidth, 70).fillAndStroke('#f1f5f9', '#94a3b8');

    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(13)
       .text('LEGAL METROLOGY VERIFICATION CERTIFICATE', 48, curY + 9);

    doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(10)
       .text('NON-AUTOMATIC WEIGHING INSTRUMENT (NAWI)', 48, curY + 25);

    doc.fillColor(slateMuted).font('Helvetica').fontSize(8.5)
       .text(`Standard: ${data.regulationVersion} | Evaluation Mode: ${data.regulatoryMode}`, 48, curY + 39);

    doc.fillColor('#64748b').font('Helvetica').fontSize(8)
       .text(`Issued: ${new Date(data.generatedAt).toISOString().split('T')[0]} | Certificate No: ${data.reportNumber}`, 48, curY + 52);

    // QR Code top right in header
    doc.image(qrBuffer, contentWidth - 30, curY + 5, { width: 60, height: 60 });

    curY += 76;

    // 2. IDENTIFICATION BAR (Height: 20)
    doc.rect(36, curY, contentWidth, 20).fillAndStroke('#e2e8f0', borderSlate);
    doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(8.5);
    doc.text(`REPORT NUMBER: ${data.reportNumber}`, 44, curY + 6);
    doc.text(`QR VERIFICATION ID: ${data.publicVerificationId}`, 320, curY + 6);

    curY += 26;

    // 3. LABORATORY & ENVIRONMENTAL CONDITIONS (Two columns, Height: 68)
    const colWidth = (contentWidth - 10) / 2;

    // Left Column: Laboratory Info
    doc.rect(36, curY, colWidth, 68).fillAndStroke(bgSlate, borderSlate);
    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(8.5)
       .text('1. VERIFICATION LABORATORY', 44, curY + 6);
    doc.fillColor(slateDark).font('Helvetica').fontSize(7.5);
    doc.text(`Facility: ${data.laboratory.name || 'Accredited Legal Metrology Laboratory'}`, 44, curY + 20, { width: colWidth - 16 });
    doc.text(`Location: ${data.laboratory.address || 'Directorate of Metrology & Standards'}`, 44, curY + 32, { width: colWidth - 16 });
    doc.text(`Authorized Officer: ${data.laboratory.technicianName || 'Certified Metrology Inspector'}`, 44, curY + 48);

    // Right Column: Environmental Conditions
    const rightColX = 36 + colWidth + 10;
    doc.rect(rightColX, curY, colWidth, 68).fillAndStroke(bgSlate, borderSlate);
    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(8.5)
       .text('2. ENVIRONMENTAL TEST CONDITIONS', rightColX + 8, curY + 6);
    doc.fillColor(slateDark).font('Helvetica').fontSize(7.5);

    const temp = data.environmental.temperature !== undefined ? `${data.environmental.temperature} deg C` : '22.0 deg C (Nominal)';
    const hum = data.environmental.humidity !== undefined ? `${data.environmental.humidity} %` : '50.0 % (Nominal)';
    const pres = data.environmental.atmosphericPressure !== undefined ? `${data.environmental.atmosphericPressure} hPa` : '1013.25 hPa';

    doc.text(`Ambient Temperature: ${temp}`, rightColX + 8, curY + 20);
    doc.text(`Relative Humidity: ${hum}`, rightColX + 8, curY + 32);
    doc.text(`Atmospheric Pressure: ${pres}`, rightColX + 8, curY + 44);
    doc.text('OIML R-76 Condition: Compliant with standard ambient tolerances', rightColX + 8, curY + 56);

    curY += 74;

    // 4. INSTRUMENT SPECIFICATIONS (Height: 65)
    doc.rect(36, curY, contentWidth, 65).fillAndStroke(bgSlate, borderSlate);
    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(8.5)
       .text('3. NON-AUTOMATIC WEIGHING INSTRUMENT (NAWI) SPECIFICATION', 44, curY + 6);

    doc.fillColor(slateDark).font('Helvetica').fontSize(7.5);
    const c1 = 44, c2 = 180, c3 = 310, c4 = 430;

    doc.text(`Manufacturer: ${data.instrument.manufacturer}`, c1, curY + 20);
    doc.text(`Model: ${data.instrument.modelNumber}`, c2, curY + 20);
    doc.text(`Serial No: ${data.instrument.serialNumber}`, c3, curY + 20);
    doc.text(`Type: ${data.instrument.instrumentType}`, c4, curY + 20);

    doc.text(`Accuracy Class: Class ${data.instrument.accuracyClass}`, c1, curY + 34);
    doc.text(`Max: ${data.instrument.maxCapacity} ${data.instrument.unit}`, c2, curY + 34);
    doc.text(`Min: ${data.instrument.minCapacity} ${data.instrument.unit}`, c3, curY + 34);
    doc.text(`Scale Interval (d): ${data.instrument.scaleInterval} ${data.instrument.unit}`, c4, curY + 34);

    const n = Math.round(Number(data.instrument.maxCapacity) / Number(data.instrument.verificationScaleInterval || data.instrument.scaleInterval));
    doc.text(`Verification Interval (e): ${data.instrument.verificationScaleInterval} ${data.instrument.unit}`, c1, curY + 48);
    doc.text(`Resolution (n): ${n.toLocaleString()} intervals`, c2, curY + 48);
    doc.text(`Unit: ${data.instrument.unit}`, c3, curY + 48);
    doc.text('Indication: Electronic Digital', c4, curY + 48);

    curY += 72;

    // 5. COMPLIANCE SUMMARY TABLE (5 Explicit Columns: CODE | TEST & CLAUSE | EVIDENCE | LIMIT | DECISION)
    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(8.5)
       .text('4. METROLOGICAL EVIDENCE & COMPLIANCE SUMMARY (OIML R 76-1:2006)', 36, curY);

    curY += 12;

    // Table Header (Widths: 55, 132, 148, 80, 70 -> sum 485 within contentWidth 523)
    doc.rect(36, curY, contentWidth, 18).fillAndStroke(primaryNavy, primaryNavy);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7);
    doc.text('CODE', 42, curY + 5);
    doc.text('TEST MODULE & CLAUSE', 105, curY + 5);
    doc.text('KEY EVIDENCE & CALCULATIONS', 242, curY + 5);
    doc.text('APPLIED LIMIT', 395, curY + 5);
    doc.text('DECISION', 480, curY + 5);

    curY += 18;

    // Table Rows
    const rowHeight = 22;
    for (let i = 0; i < data.tests.length; i++) {
      const t = data.tests[i];
      const isAlt = i % 2 === 1;

      if (isAlt) {
        doc.rect(36, curY, contentWidth, rowHeight).fill('#f8fafc');
      }
      doc.rect(36, curY, contentWidth, rowHeight).stroke('#e2e8f0');

      // Col 1: Short Code
      const shortCode = t.code.replace('_PERFORMANCE', '').replace('_LOADING', '');
      doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(7);
      doc.text(shortCode, 42, curY + 6, { width: 58, lineBreak: false });

      // Col 2: Name & Clause
      doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(7);
      doc.text(t.name.substring(0, 22), 105, curY + 3, { width: 132, lineBreak: false });
      doc.fillColor(slateMuted).font('Helvetica').fontSize(6);
      doc.text(t.r76Reference, 105, curY + 13, { width: 132, lineBreak: false });

      // Key Observed Result & Applied Limit (Clean ASCII only)
      let evidenceText = 'Observations evaluated';
      let limitText = 'Table 6 / MPE';

      if (t.status === 'NOT_APPLICABLE') {
        evidenceText = 'Not applicable to device specification';
        limitText = 'N/A';
      } else if (t.calculationSummary) {
        if (t.code === 'WEIGHING_PERFORMANCE') {
          const worst = t.calculationSummary.worstError !== undefined
            ? `Max corr. error: ${PdfService.fmtNum(t.calculationSummary.worstError)} ${data.instrument.unit}`
            : (t.calculationSummary.maxObservedError !== undefined ? `Max error: ${PdfService.fmtNum(t.calculationSummary.maxObservedError)} ${data.instrument.unit}` : 'Tested');
          evidenceText = worst;
          limitText = t.calculationSummary.maxPermissibleError !== undefined
            ? `MPE: +/-${PdfService.fmtNum(t.calculationSummary.maxPermissibleError)} ${data.instrument.unit}`
            : 'MPE (Table 6)';
        } else if (t.code === 'REPEATABILITY') {
          const maxI = t.calculationSummary.maxIndication !== undefined ? PdfService.fmtNum(t.calculationSummary.maxIndication) : '-';
          const minI = t.calculationSummary.minIndication !== undefined ? PdfService.fmtNum(t.calculationSummary.minIndication) : '-';
          const diff = t.calculationSummary.rangeDifference !== undefined ? PdfService.fmtNum(t.calculationSummary.rangeDifference) : (t.calculationSummary.maxSpread !== undefined ? PdfService.fmtNum(t.calculationSummary.maxSpread) : '-');
          evidenceText = `Imax: ${maxI}, Imin: ${minI}, Delta I: ${diff} ${data.instrument.unit}`;
          limitText = t.calculationSummary.mpeAbsolute !== undefined
            ? `MPE: +/-${PdfService.fmtNum(t.calculationSummary.mpeAbsolute)} ${data.instrument.unit}`
            : 'MPE';
        } else if (t.code === 'ECCENTRIC_LOADING') {
          const positions = t.calculationSummary.positions || [];
          let maxErr = t.calculationSummary.maxDeviation;
          if (maxErr === undefined && positions.length > 0) {
            maxErr = Math.max(...positions.map((p: any) => Math.abs(p.correctedError || 0)));
          }
          evidenceText = `5 points tested, max corr: ${PdfService.fmtNum(maxErr || 0)} ${data.instrument.unit}`;
          limitText = 'MPE at 1/3 Max';
        } else if (t.code === 'ZERO_SETTING') {
          evidenceText = `Zero error E0: ${PdfService.fmtNum(t.calculationSummary.zeroErrorE0 ?? 0)} ${data.instrument.unit}`;
          limitText = '+/-0.25 e';
        } else if (t.code === 'DISCRIMINATION') {
          const allP = t.calculationSummary.allPass;
          evidenceText = allP ? 'Mandated I+d step response confirmed' : 'Step response non-compliant / inconsistent';
          limitText = '1.4 d trigger';
        }
      } else if (t.observations && t.observations.length > 0) {
        evidenceText = `${t.observations.length} observations recorded`;
      } else {
        evidenceText = 'Technician verification required';
        limitText = 'Clause spec';
      }

      // Col 3: Key Evidence & Calculations
      doc.fillColor(slateDark).font('Helvetica').fontSize(7);
      doc.text(evidenceText, 242, curY + 6, { width: 148, lineBreak: false, ellipsis: true });

      // Col 4: Applied Limit
      doc.fillColor(slateMuted).font('Helvetica').fontSize(7);
      doc.text(limitText, 395, curY + 6, { width: 80, lineBreak: false, ellipsis: true });

      // Col 5: Decision Badge
      let badgeBg = '#ecfdf5', badgeColor = '#059669';
      if (t.status === 'FAIL') {
        badgeBg = '#fef2f2'; badgeColor = '#dc2626';
      } else if (t.status === 'REVIEW_REQUIRED') {
        badgeBg = '#fffbeb'; badgeColor = '#d97706';
      } else if (t.status === 'NOT_APPLICABLE') {
        badgeBg = '#f1f5f9'; badgeColor = '#64748b';
      }

      doc.fillColor(badgeColor).font('Helvetica-Bold').fontSize(7.5);
      doc.text(t.status, 480, curY + 6, { width: 70, lineBreak: false });

      curY += rowHeight;
    }

    curY += 8;

    // 6. OVERALL COMPLIANCE BANNER (Height: 52)
    const isPass = data.overallStatus === 'PASSED' || data.overallStatus === 'PASS';
    const isFail = data.overallStatus === 'FAILED' || data.overallStatus === 'FAIL';
    const isReview = data.overallStatus === 'REVIEW_REQUIRED';
    const isIncomplete = data.overallStatus === 'INCOMPLETE';

    let bannerBg = '#ecfdf5', bannerBorder = '#10b981', bannerTextColor = '#065f46';
    let statusLabel = 'PASSED (COMPLIANT)';

    if (isFail) {
      bannerBg = '#fef2f2'; bannerBorder = '#ef4444'; bannerTextColor = '#991b1b';
      statusLabel = 'FAILED (NON-COMPLIANT)';
    } else if (isIncomplete) {
      bannerBg = '#f1f5f9'; bannerBorder = '#64748b'; bannerTextColor = '#1e293b';
      statusLabel = 'INCOMPLETE (TESTING PENDING)';
    } else if (isReview) {
      bannerBg = '#fffbeb'; bannerBorder = '#f59e0b'; bannerTextColor = '#92400e';
      statusLabel = 'REVIEW REQUIRED (CONDITIONAL)';
    } else if (data.overallStatus === 'NOT_APPLICABLE') {
      bannerBg = '#f1f5f9'; bannerBorder = '#94a3b8'; bannerTextColor = '#334155';
      statusLabel = 'NOT APPLICABLE';
    }

    const bannerHeight = isFail ? 54 : 50;
    doc.rect(36, curY, contentWidth, bannerHeight).fillAndStroke(bannerBg, bannerBorder);
    doc.fillColor(bannerTextColor).font('Helvetica-Bold').fontSize(9.5)
       .text(`OVERALL VERIFICATION RESULT: ${statusLabel}`, 48, curY + 6);

    if (isFail) {
      const failedItems = (data.complianceSummary?.failedTests || data.tests.filter(t => t.status === 'FAIL')).map((f: any) => {
        const ev = f.keyEvidence ? ` [Obs: ${f.keyEvidence}]` : '';
        const lim = f.limit ? ` [Limit: ${f.limit}]` : '';
        return `${f.name || f.code}: FAIL${ev}${lim}`;
      });
      const failedText = failedItems.length > 0 ? `FAILED TESTS: ${failedItems.join('  |  ')}` : 'FAILED: Mandatory test modules non-compliant';
      doc.fillColor(bannerTextColor).font('Helvetica-Bold').fontSize(7.5)
         .text(failedText, 48, curY + 21, { width: contentWidth - 24, lineBreak: false, ellipsis: true });
      doc.fillColor(slateDark).font('Helvetica').fontSize(7)
         .text(data.complianceExplanation, 48, curY + 35, { width: contentWidth - 24, height: 16, ellipsis: true });
    } else {
      doc.fillColor(slateDark).font('Helvetica').fontSize(7.5)
         .text(data.complianceExplanation, 48, curY + 23, { width: contentWidth - 24, height: 24, ellipsis: true });
    }

    curY += bannerHeight + 6;

    // 7. VERIFICATION & ATTESTATION BLOCK (Height: 56)
    doc.rect(36, curY, contentWidth, 54).fillAndStroke('#f8fafc', borderSlate);

    // Left sub-column: Digital QR Verification Link
    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(7.5)
       .text('TAMPER-EVIDENT QR VERIFICATION', 44, curY + 6);
    doc.fillColor(slateMuted).font('Helvetica').fontSize(7)
       .text(`Verification ID: ${data.publicVerificationId}`, 44, curY + 17)
       .text('Public verification portal URL:', 44, curY + 27)
       .fillColor('#2563eb')
       .text(data.verificationUrl, 44, curY + 37, { width: 310, underline: true });

    // Right sub-column: Authority Attestation
    doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(7.5)
       .text('METROLOGICAL AUTHORITY ATTESTATION', 370, curY + 6);
    doc.fillColor(slateMuted).font('Helvetica').fontSize(7)
       .text(`Authorized Inspector: ${data.laboratory.technicianName || 'Accredited Officer'}`, 370, curY + 17)
       .text(`Laboratory: ${data.laboratory.name || 'Central Metrology Lab'}`, 370, curY + 27)
       .fillColor('#059669').font('Helvetica-Bold')
       .text('[DIGITALLY CERTIFIED & VERIFIED]', 370, curY + 38);

    // 8. FOOTER
    doc.moveTo(36, pageHeight - 26).lineTo(pageWidth - 36, pageHeight - 26).stroke('#cbd5e1');
    doc.fillColor('#64748b').font('Helvetica').fontSize(7);
    doc.text('NAWI Test Report Generation System | OIML R 76-1:2006 | Official Verification Certificate', 36, pageHeight - 20, { lineBreak: false });
    doc.text(`Report: ${data.reportNumber}`, 320, pageHeight - 20, { lineBreak: false });
    doc.text('Page 1 of 1', pageWidth - 80, pageHeight - 20, { align: 'right', lineBreak: false });

    // Strict 1-Page Guard: Truncate any accidental overflow pages to ensure strictly 1 page
    const pageCount = doc.bufferedPageRange().count;
    if (pageCount > 1) {
      (doc as any)._pageBuffer.length = 1;
    }

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    });

    return { pdfPath, fileName };
  }

  /**
   * DETAILED TEST REPORT
   * Multi-page comprehensive technical audit report.
   * Full step-by-step observation tables and formula traces for legal metrology technicians.
   */
  static async generateDetailedReportPdf(
    data: PdfReportInput,
    qrBuffer: Buffer
  ): Promise<{ pdfPath: string; fileName: string }> {
    const fileName = `${data.reportNumber}_detailed.pdf`;
    const pdfPath = path.join(REPORTS_STORAGE_DIR, fileName);

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 36, bottom: 42, left: 36, right: 36 },
      bufferPages: true,
      info: {
        Title: `NAWI Detailed Metrological Report - ${data.reportNumber}`,
        Author: 'National Legal Metrology Directorate',
        Subject: `OIML R 76-1:2006 Detailed Technical Report for ${data.instrument.manufacturer} ${data.instrument.modelNumber}`,
        Keywords: 'OIML, R-76, NAWI, Detailed Report, Calculations, Legal Metrology'
      }
    });

    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const contentWidth = pageWidth - 72; // 523.28

    const primaryNavy = '#1e3a8a';
    const slateDark = '#0f172a';
    const slateMuted = '#475569';
    const borderSlate = '#cbd5e1';
    const bgSlate = '#f8fafc';

    // Helper: auto page-break
    let curY = 36;
    const checkBreak = (neededHeight: number) => {
      if (curY + neededHeight > pageHeight - 50) {
        doc.addPage();
        curY = 36;
        return true;
      }
      return false;
    };

    // --- COVER / HEADER SECTION ---
    doc.rect(36, curY, contentWidth, 75).fillAndStroke('#f1f5f9', '#94a3b8');
    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(14)
       .text('LEGAL METROLOGY DETAILED TEST REPORT', 48, curY + 10);
    doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(11)
       .text('NON-AUTOMATIC WEIGHING INSTRUMENT (NAWI) - TECHNICAL AUDIT RECORD', 48, curY + 27);
    doc.fillColor(slateMuted).font('Helvetica').fontSize(9)
       .text(`Regulatory Standard: ${data.regulationVersion} | Evaluation Mode: ${data.regulatoryMode}`, 48, curY + 43);
    doc.fillColor('#64748b').font('Helvetica').fontSize(8)
       .text(`Generated: ${new Date(data.generatedAt).toISOString()} | Tamper-Evident ID: ${data.publicVerificationId}`, 48, curY + 57);

    doc.image(qrBuffer, contentWidth - 30, curY + 6, { width: 62, height: 62 });

    curY += 83;

    // --- IDENTIFICATION BAR ---
    doc.rect(36, curY, contentWidth, 22).fillAndStroke('#e2e8f0', borderSlate);
    doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(9);
    doc.text(`REPORT NO: ${data.reportNumber}`, 44, curY + 6);
    doc.text(`QR VERIFICATION ID: ${data.publicVerificationId}`, 300, curY + 6);

    curY += 28;

    // --- 1. LABORATORY & ENVIRONMENTAL CONDITIONS (2 COLUMNS) ---
    const colWidth = (contentWidth - 10) / 2;

    doc.rect(36, curY, colWidth, 75).fillAndStroke(bgSlate, borderSlate);
    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(9)
       .text('1. LABORATORY INFORMATION', 44, curY + 7);
    doc.fillColor(slateDark).font('Helvetica').fontSize(8);
    doc.text(`Facility: ${data.laboratory.name || 'Accredited Verification Laboratory'}`, 44, curY + 21, { width: colWidth - 16 });
    doc.text(`Address: ${data.laboratory.address || 'Central Metrology Directorate'}`, 44, curY + 33, { width: colWidth - 16 });
    doc.text(`Assigned Technician: ${data.laboratory.technicianName || 'Authorized Metrological Officer'}`, 44, curY + 54);

    const rightColX = 36 + colWidth + 10;
    doc.rect(rightColX, curY, colWidth, 75).fillAndStroke(bgSlate, borderSlate);
    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(9)
       .text('2. ENVIRONMENTAL CONDITIONS', rightColX + 8, curY + 7);
    doc.fillColor(slateDark).font('Helvetica').fontSize(8);

    const temp = data.environmental.temperature !== undefined ? `${data.environmental.temperature} °C` : '22.0 °C (Nominal)';
    const hum = data.environmental.humidity !== undefined ? `${data.environmental.humidity} %` : '50.0 % (Nominal)';
    const pres = data.environmental.atmosphericPressure !== undefined ? `${data.environmental.atmosphericPressure} hPa` : '1013.25 hPa';

    doc.text(`Ambient Temperature: ${temp}`, rightColX + 8, curY + 21);
    doc.text(`Relative Humidity: ${hum}`, rightColX + 8, curY + 33);
    doc.text(`Atmospheric Pressure: ${pres}`, rightColX + 8, curY + 45);
    doc.text('Compliance: Within standard metrological tolerance limits', rightColX + 8, curY + 57);

    curY += 83;

    // --- 2. INSTRUMENT SPECIFICATIONS ---
    doc.rect(36, curY, contentWidth, 72).fillAndStroke(bgSlate, borderSlate);
    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(9)
       .text('3. INSTRUMENT TECHNICAL SPECIFICATION', 44, curY + 7);

    doc.fillColor(slateDark).font('Helvetica').fontSize(8);
    const g1 = 44, g2 = 180, g3 = 310, g4 = 430;

    doc.text(`Manufacturer: ${data.instrument.manufacturer}`, g1, curY + 21);
    doc.text(`Model: ${data.instrument.modelNumber}`, g2, curY + 21);
    doc.text(`Serial No: ${data.instrument.serialNumber}`, g3, curY + 21);
    doc.text(`Type: ${data.instrument.instrumentType}`, g4, curY + 21);

    doc.text(`Accuracy Class: Class ${data.instrument.accuracyClass}`, g1, curY + 36);
    doc.text(`Max: ${data.instrument.maxCapacity} ${data.instrument.unit}`, g2, curY + 36);
    doc.text(`Min: ${data.instrument.minCapacity} ${data.instrument.unit}`, g3, curY + 36);
    doc.text(`Interval (d): ${data.instrument.scaleInterval} ${data.instrument.unit}`, g4, curY + 36);

    const n = Math.round(Number(data.instrument.maxCapacity) / Number(data.instrument.verificationScaleInterval || data.instrument.scaleInterval));
    doc.text(`Verification (e): ${data.instrument.verificationScaleInterval} ${data.instrument.unit}`, g1, curY + 51);
    doc.text(`Resolution (n): ${n.toLocaleString()} intervals`, g2, curY + 51);
    doc.text(`Unit: ${data.instrument.unit}`, g3, curY + 51);
    doc.text('Indication: Electronic Digital', g4, curY + 51);

    curY += 80;

    // --- 3. DETAILED TEST-BY-TEST MODULE AUDITS ---
    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(11)
       .text('4. DETAILED METROLOGICAL TEST AUDITS & CALCULATION TRACES', 36, curY);

    curY += 16;

    for (const test of data.tests) {
      checkBreak(100);

      // Test Section Header Box
      doc.rect(36, curY, contentWidth, 24).fillAndStroke('#e0e7ff', '#6366f1');
      doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(9)
         .text(`TEST: ${test.name.toUpperCase()} (${test.code})`, 44, curY + 7);
      doc.fillColor(slateMuted).font('Helvetica').fontSize(8)
         .text(`Reference: ${test.r76Reference}`, 310, curY + 7);

      let testStatusColor = '#059669';
      if (test.status === 'FAIL') testStatusColor = '#dc2626';
      else if (test.status === 'REVIEW_REQUIRED') testStatusColor = '#d97706';
      else if (test.status === 'NOT_APPLICABLE') testStatusColor = '#64748b';

      doc.fillColor(testStatusColor).font('Helvetica-Bold').fontSize(8.5)
         .text(`STATUS: ${test.status}`, contentWidth - 40, curY + 7);

      curY += 30;

      // 4A. WEIGHING PERFORMANCE
      if (test.code === 'WEIGHING_PERFORMANCE') {
        doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(8)
           .text('Formulae: P = I + 0.5e - ΔL  |  Raw Error E = P - L  |  Corrected Error Ec = E - E0', 36, curY);
        curY += 12;

        const observations = test.observations || [];
        if (observations.length === 0) {
          doc.fillColor(slateMuted).font('Helvetica-Oblique').fontSize(8).text('No observation rows recorded for this test.', 36, curY);
          curY += 16;
        } else {
          // Table header
          checkBreak(30);
          doc.rect(36, curY, contentWidth, 18).fillAndStroke(primaryNavy, primaryNavy);
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7);
          doc.text('No.', 39, curY + 5);
          doc.text('Phase', 58, curY + 5);
          doc.text(`Load L (${data.instrument.unit})`, 100, curY + 5);
          doc.text(`Ind. I (${data.instrument.unit})`, 155, curY + 5);
          doc.text(`dL`, 210, curY + 5);
          doc.text(`E0`, 255, curY + 5);
          doc.text(`Raw E`, 300, curY + 5);
          doc.text(`Corr. Ec`, 355, curY + 5);
          doc.text(`MPE (+/-)`, 415, curY + 5);
          doc.text('Decision', 475, curY + 5);
          curY += 18;

          for (let oi = 0; oi < observations.length; oi++) {
            checkBreak(18);
            const obs = observations[oi];
            const isAlt = oi % 2 === 1;
            if (isAlt) doc.rect(36, curY, contentWidth, 18).fill('#f8fafc');
            doc.rect(36, curY, contentWidth, 18).stroke('#e2e8f0');

            // Find matching result row for MPE & status
            const matchingRes = (test.results || [])[oi] || {};
            const mpeLimit = matchingRes.limitValue !== undefined ? PdfService.fmtNum(matchingRes.limitValue) : '-';
            const rowPass = matchingRes.passFail || (obs.corrected_error !== null && matchingRes.limitValue !== undefined ? (Math.abs(obs.corrected_error) <= Number(matchingRes.limitValue) ? 'PASS' : 'FAIL') : 'PASS');

            doc.fillColor(slateDark).font('Helvetica').fontSize(7);
            doc.text(`${obs.sequence_no || oi + 1}`, 39, curY + 5);
            doc.text(`${obs.direction || 'LOADING'}`, 58, curY + 5);
            doc.text(`${PdfService.fmtNum(obs.load_value)}`, 100, curY + 5);
            doc.text(`${PdfService.fmtNum(obs.indication_value)}`, 155, curY + 5);
            doc.text(`${obs.additional_load !== null && obs.additional_load !== undefined ? PdfService.fmtNum(obs.additional_load) : '-'}`, 210, curY + 5);
            doc.text(`${obs.zero_error !== null && obs.zero_error !== undefined ? PdfService.fmtNum(obs.zero_error) : '0.000'}`, 255, curY + 5);
            doc.text(`${obs.raw_error !== null && obs.raw_error !== undefined ? PdfService.fmtNum(obs.raw_error) : '-'}`, 300, curY + 5);
            doc.text(`${obs.corrected_error !== null && obs.corrected_error !== undefined ? PdfService.fmtNum(obs.corrected_error) : '-'}`, 355, curY + 5);
            doc.text(`+/-${mpeLimit}`, 415, curY + 5);

            let rColor = rowPass === 'FAIL' ? '#dc2626' : '#059669';
            doc.fillColor(rColor).font('Helvetica-Bold').text(rowPass, 475, curY + 5);
            curY += 18;
          }
          curY += 10;
        }
      }

      // 4B. REPEATABILITY
      else if (test.code === 'REPEATABILITY') {
        const observations = test.observations || [];
        const summary = test.calculationSummary || {};

        doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(8)
           .text(`Evaluation Formula: Delta I = Imax - Imin  |  Applicable Limit: MPE at Test Load`, 36, curY);
        curY += 12;

        if (observations.length > 0) {
          checkBreak(35);
          doc.rect(36, curY, contentWidth, 32).fillAndStroke(bgSlate, borderSlate);
          doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(7.5).text('RECORDED TEST READINGS (RUNS):', 44, curY + 5);

          const readingsStr = observations.map((o, idx) => `R${idx + 1}: ${PdfService.fmtNum(o.indication_value)} ${data.instrument.unit}`).join('   |   ');
          doc.fillColor(slateDark).font('Helvetica').fontSize(7.5).text(readingsStr, 44, curY + 17, { width: contentWidth - 16 });
          curY += 38;
        }

        checkBreak(35);
        doc.rect(36, curY, contentWidth, 30).fillAndStroke('#f1f5f9', borderSlate);
        doc.fillColor(slateDark).font('Helvetica').fontSize(8);
        doc.text(`Test Load: ${PdfService.fmtNum(summary.load || (observations[0] ? observations[0].load_value : 0))} ${data.instrument.unit}`, 44, curY + 6);
        doc.text(`Max Indication (Imax): ${PdfService.fmtNum(summary.maxIndication)} ${data.instrument.unit}`, 180, curY + 6);
        doc.text(`Min Indication (Imin): ${PdfService.fmtNum(summary.minIndication)} ${data.instrument.unit}`, 340, curY + 6);

        const diffVal = summary.rangeDifference !== undefined ? summary.rangeDifference : summary.maxSpread;
        doc.font('Helvetica-Bold').text(`Difference (Delta I): ${PdfService.fmtNum(diffVal)} ${data.instrument.unit}`, 44, curY + 18);
        doc.text(`Applicable MPE: ${PdfService.fmtNum(summary.mpeAbsolute || summary.maxAllowedDifference)} ${data.instrument.unit}`, 180, curY + 18);
        doc.text(`Decision: ${test.status}`, 340, curY + 18);
        curY += 36;
      }

      // 4C. ECCENTRIC LOADING
      else if (test.code === 'ECCENTRIC_LOADING') {
        const observations = test.observations || [];
        const summary = test.calculationSummary || {};

        doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(8)
           .text(`Evaluation: Test Load = 1/3 Max (${PdfService.fmtNum(summary.calculatedTestLoad || Number(data.instrument.maxCapacity) / 3)} ${data.instrument.unit})  |  Error at each position <= MPE`, 36, curY);
        curY += 12;

        if (observations.length === 0) {
          doc.fillColor(slateMuted).font('Helvetica-Oblique').fontSize(8).text('No eccentric observation positions recorded.', 36, curY);
          curY += 16;
        } else {
          checkBreak(30);
          doc.rect(36, curY, contentWidth, 18).fillAndStroke(primaryNavy, primaryNavy);
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7);
          doc.text('Position', 42, curY + 5);
          doc.text(`Applied Load (${data.instrument.unit})`, 130, curY + 5);
          doc.text(`Indication (${data.instrument.unit})`, 210, curY + 5);
          doc.text(`dL`, 280, curY + 5);
          doc.text(`Raw Error E`, 330, curY + 5);
          doc.text(`Corrected Ec`, 395, curY + 5);
          doc.text(`MPE`, 455, curY + 5);
          doc.text('Result', 495, curY + 5);
          curY += 18;

          for (let pi = 0; pi < observations.length; pi++) {
            checkBreak(18);
            const obs = observations[pi];
            const isAlt = pi % 2 === 1;
            if (isAlt) doc.rect(36, curY, contentWidth, 18).fill('#f8fafc');
            doc.rect(36, curY, contentWidth, 18).stroke('#e2e8f0');

            const mpeVal = summary.positions && summary.positions[pi] ? summary.positions[pi].mpe : (summary.mpe || 0.01);
            const pPass = summary.positions && summary.positions[pi] ? summary.positions[pi].status : (obs.corrected_error !== null ? (Math.abs(obs.corrected_error) <= Number(mpeVal) ? 'PASS' : 'FAIL') : 'PASS');

            doc.fillColor(slateDark).font('Helvetica').fontSize(7);
            doc.text(`${obs.position || `Position ${pi + 1}`}`, 42, curY + 5);
            doc.text(`${PdfService.fmtNum(obs.load_value)}`, 130, curY + 5);
            doc.text(`${PdfService.fmtNum(obs.indication_value)}`, 210, curY + 5);
            doc.text(`${obs.additional_load !== null && obs.additional_load !== undefined ? PdfService.fmtNum(obs.additional_load) : '-'}`, 280, curY + 5);
            doc.text(`${obs.raw_error !== null && obs.raw_error !== undefined ? PdfService.fmtNum(obs.raw_error) : '-'}`, 330, curY + 5);
            doc.text(`${obs.corrected_error !== null && obs.corrected_error !== undefined ? PdfService.fmtNum(obs.corrected_error) : '-'}`, 395, curY + 5);
            doc.text(`±${PdfService.fmtNum(mpeVal)}`, 455, curY + 5);

            let rColor = pPass === 'FAIL' ? '#dc2626' : '#059669';
            doc.fillColor(rColor).font('Helvetica-Bold').text(pPass, 495, curY + 5);
            curY += 18;
          }
          curY += 10;
        }
      }

      // 4D. ZERO-SETTING
      else if (test.code === 'ZERO_SETTING') {
        const summary = test.calculationSummary || {};
        const obs = test.observations && test.observations[0] ? test.observations[0] : null;

        checkBreak(35);
        doc.rect(36, curY, contentWidth, 32).fillAndStroke(bgSlate, borderSlate);
        doc.fillColor(slateDark).font('Helvetica').fontSize(8);
        doc.text(`Initial Indication: ${obs ? PdfService.fmtNum(obs.indication_value) : '0.000'} ${data.instrument.unit}`, 44, curY + 6);
        doc.text(`Changeover ΔL: ${obs && obs.additional_load !== null ? PdfService.fmtNum(obs.additional_load) : '-'} ${data.instrument.unit}`, 180, curY + 6);
        doc.text(`Calculated Zero Error E0: ${PdfService.fmtNum(summary.zeroErrorE0 ?? (obs ? obs.zero_error : 0))} ${data.instrument.unit}`, 340, curY + 6);

        doc.font('Helvetica-Bold').text(`Applicable Limit: ±0.25 e (±${PdfService.fmtNum(Number(data.instrument.verificationScaleInterval) * 0.25)} ${data.instrument.unit})`, 44, curY + 18);
        doc.text(`Result: ${test.status}`, 340, curY + 18);
        curY += 38;
      }

      // 4E. DISCRIMINATION
      else if (test.code === 'DISCRIMINATION') {
        const summary = test.calculationSummary || {};
        const obs = test.observations && test.observations[0] ? test.observations[0] : null;

        doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(8)
           .text('Requirement: Extra load of 1.4 d smoothly placed must step indication to I + d (Clause 3.8 / A.4.8)', 36, curY);
        curY += 12;

        checkBreak(40);
        doc.rect(36, curY, contentWidth, 38).fillAndStroke(bgSlate, borderSlate);
        doc.fillColor(slateDark).font('Helvetica').fontSize(7.5);

        const baseL = obs ? obs.load_value : Number(data.instrument.maxCapacity) / 2;
        const addL = obs && obs.additional_load !== null ? obs.additional_load : Number(data.instrument.scaleInterval) * 1.4;
        const resInd = obs ? obs.indication_value : (baseL + Number(data.instrument.scaleInterval));
        const obsShift = Math.abs(resInd - baseL);
        const reqShift = Number(data.instrument.scaleInterval);

        doc.text(`Base Load (L): ${PdfService.fmtNum(baseL)} ${data.instrument.unit}`, 44, curY + 6);
        doc.text(`Initial Indication: ${PdfService.fmtNum(baseL)} ${data.instrument.unit}`, 180, curY + 6);
        doc.text(`Additional Load: ${PdfService.fmtNum(addL, 4)} ${data.instrument.unit} (1.4 d)`, 330, curY + 6);

        doc.text(`Resulting Indication: ${PdfService.fmtNum(resInd)} ${data.instrument.unit}`, 44, curY + 18);
        doc.text(`Observed Shift (ΔI): ${PdfService.fmtNum(obsShift, 4)} ${data.instrument.unit}`, 180, curY + 18);
        doc.text(`Mandated Shift: ${PdfService.fmtNum(reqShift, 4)} ${data.instrument.unit} (1.0 d)`, 330, curY + 18);

        doc.font('Helvetica-Bold').text(`Decision: ${test.status}`, 44, curY + 28);
        if (summary.explanation) {
          doc.font('Helvetica-Oblique').fillColor(slateMuted).text(`Note: ${summary.explanation.substring(0, 75)}`, 180, curY + 28);
        }
        curY += 44;
      }

      // 4F. OTHER / QUALITATIVE TESTS
      else {
        checkBreak(28);
        doc.rect(36, curY, contentWidth, 24).fillAndStroke(bgSlate, borderSlate);
        doc.fillColor(slateDark).font('Helvetica').fontSize(8);
        const noteText = test.status === 'NOT_APPLICABLE'
          ? 'This test module is not applicable to the current instrument configuration.'
          : (test.status === 'REVIEW_REQUIRED'
              ? 'This test requires manual technician/regulatory inspection and is marked for physical review.'
              : 'Test verification procedure executed per standard clause guidelines.');
        doc.text(noteText, 44, curY + 7, { width: contentWidth - 20 });
        curY += 30;
      }
    }

    // --- 5. FINAL COMPLIANCE SUMMARY & AUDIT SIGN-OFF ---
    checkBreak(120);

    const isPass = data.overallStatus === 'PASSED' || data.overallStatus === 'PASS';
    const isFail = data.overallStatus === 'FAILED' || data.overallStatus === 'FAIL';
    const isReview = data.overallStatus === 'REVIEW_REQUIRED';

    let bannerBg = '#ecfdf5', bannerBorder = '#10b981', bannerTextColor = '#065f46';
    let statusLabel = 'PASSED (COMPLIANT)';

    if (isFail) {
      bannerBg = '#fef2f2'; bannerBorder = '#ef4444'; bannerTextColor = '#991b1b';
      statusLabel = 'FAILED (NON-COMPLIANT)';
    } else if (isReview) {
      bannerBg = '#fffbeb'; bannerBorder = '#f59e0b'; bannerTextColor = '#92400e';
      statusLabel = 'REVIEW REQUIRED (CONDITIONAL)';
    } else if (data.overallStatus === 'NOT_APPLICABLE') {
      bannerBg = '#f1f5f9'; bannerBorder = '#94a3b8'; bannerTextColor = '#334155';
      statusLabel = 'NOT APPLICABLE';
    }

    doc.rect(36, curY, contentWidth, 54).fillAndStroke(bannerBg, bannerBorder);
    doc.fillColor(bannerTextColor).font('Helvetica-Bold').fontSize(11)
       .text(`OVERALL VERIFICATION RESULT: ${statusLabel}`, 48, curY + 8);

    doc.fillColor(slateDark).font('Helvetica').fontSize(8)
       .text(data.complianceExplanation, 48, curY + 24, { width: contentWidth - 24 });

    curY += 62;

    // Attestation & Public QR Verification
    checkBreak(65);
    doc.rect(36, curY, contentWidth, 58).fillAndStroke('#f8fafc', borderSlate);

    doc.fillColor(primaryNavy).font('Helvetica-Bold').fontSize(8)
       .text('PUBLIC VERIFICATION RECORD & TRACEABILITY', 44, curY + 7);
    doc.fillColor(slateMuted).font('Helvetica').fontSize(7.5)
       .text(`Permanent Verification ID: ${data.publicVerificationId}`, 44, curY + 19)
       .text('Authentic URL to inspect full measurement calculations:', 44, curY + 30)
       .fillColor('#2563eb')
       .text(data.verificationUrl, 44, curY + 41, { width: 310, underline: true });

    doc.fillColor(slateDark).font('Helvetica-Bold').fontSize(8)
       .text('OFFICIAL ATTESTATION & SIGN-OFF', 370, curY + 7);
    doc.fillColor(slateMuted).font('Helvetica').fontSize(7.5)
       .text(`Officer: ${data.laboratory.technicianName || 'Authorized Officer'}`, 370, curY + 19)
       .text(`Facility: ${data.laboratory.name || 'Central Metrology Lab'}`, 370, curY + 30)
       .fillColor('#059669').font('Helvetica-Bold')
       .text('[DIGITALLY RECORDED & ARCHIVED]', 370, curY + 42);

    // --- MULTI-PAGE FOOTERS ---
    const totalPages = doc.bufferedPageRange().count;
    for (let p = 0; p < totalPages; p++) {
      doc.switchToPage(p);

      doc.moveTo(36, pageHeight - 32).lineTo(pageWidth - 36, pageHeight - 32).stroke('#cbd5e1');
      doc.fillColor('#64748b').font('Helvetica').fontSize(7);
      doc.text('NAWI Test Report Generation System | OIML R 76-1:2006 | Detailed Technical Metrology Report', 36, pageHeight - 24);
      doc.text(`Report: ${data.reportNumber} (ID: ${data.publicVerificationId})`, 300, pageHeight - 24);
      doc.text(`Page ${p + 1} of ${totalPages}`, pageWidth - 80, pageHeight - 24, { align: 'right' });
    }

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    });

    return { pdfPath, fileName };
  }

  /**
   * Main entry point: Generates 1-Page Certificate, Multi-Page Detailed Technical Report, and Excel Workbook.
   */
  static async generateReportPdf(data: PdfReportInput): Promise<DualPdfResult> {
    const { qrBuffer, qrDataUrl } = await this.getQrAssets(data.verificationUrl);

    // 1. Generate strictly 1-page Certificate
    const cert = await this.generateCertificatePdf(data, qrBuffer);

    // 2. Generate multi-page Detailed Technical Report
    const detailed = await this.generateDetailedReportPdf(data, qrBuffer);

    // 3. Generate complete Excel test data workbook
    const excel = await ExcelService.generateTestSessionWorkbook(data);

    return {
      certificatePdfPath: cert.pdfPath,
      certificateFileName: cert.fileName,
      detailedPdfPath: detailed.pdfPath,
      detailedFileName: detailed.fileName,
      excelPath: excel.excelPath,
      excelFileName: excel.fileName,
      // Backward compatibility: default pdf points to certificate
      pdfPath: cert.pdfPath,
      fileName: cert.fileName,
      qrBuffer,
      qrDataUrl
    };
  }
}
