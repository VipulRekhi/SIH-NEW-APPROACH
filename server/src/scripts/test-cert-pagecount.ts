import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PdfService } from '../services/pdf.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const qrBuffer = await QRCode.toBuffer('http://localhost:5173/public/report/TEST', { width: 100 });
  const mockData: any = {
    reportNumber: 'R76-2026-TEST',
    publicVerificationId: 'R76-2026-TEST',
    verificationUrl: 'http://localhost:5173/public/report/TEST',
    regulatoryMode: 'TYPE_EVALUATION',
    regulationVersion: 'OIML R 76-1:2006',
    overallStatus: 'PASS',
    complianceExplanation: 'All tests passed successfully.',
    generatedAt: new Date(),
    laboratory: { name: 'Central Lab', address: 'Main Street', technicianName: 'John Doe' },
    instrument: {
      manufacturer: 'ABC Weighing Systems',
      modelNumber: 'ABC-30',
      serialNumber: 'ABX93821',
      instrumentType: 'Electronic Non-Automatic Weighing Instrument',
      accuracyClass: 'III',
      maxCapacity: 30,
      minCapacity: 0.1,
      scaleInterval: 0.01,
      verificationScaleInterval: 0.01,
      unit: 'kg'
    },
    environmental: { temperature: 20, humidity: 50, atmosphericPressure: 1013 },
    tests: [
      { code: 'WEIGHING_PERFORMANCE', name: 'Weighing Performance', r76Reference: 'Clause 3.5.1 / A.4.4', status: 'PASS', calculationSummary: { worstError: 0.002, maxPermissibleError: 0.01 } },
      { code: 'REPEATABILITY', name: 'Repeatability Test', r76Reference: 'Clause 3.6.1 / A.4.10', status: 'PASS', calculationSummary: { maxIndication: 15, minIndication: 15, rangeDifference: 0, mpeAbsolute: 0.01 } },
      { code: 'ECCENTRIC_LOADING', name: 'Eccentric Loading', r76Reference: 'Clause 3.6.2 / A.4.7', status: 'PASS', calculationSummary: { maxDeviation: 0.003 } },
      { code: 'ZERO_SETTING', name: 'Zero-Setting & Tracking', r76Reference: 'Clause 4.5 / A.4.2', status: 'PASS', calculationSummary: { zeroErrorE0: 0 } },
      { code: 'DISCRIMINATION', name: 'Discrimination Test', r76Reference: 'Clause 3.8 / A.4.8', status: 'PASS', calculationSummary: { allPass: true } }
    ]
  };

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 32, bottom: 32, left: 36, right: 36 },
    bufferPages: true
  });
  doc.on('pageAdded', () => {
    console.log('>>> PAGE ADDED! Trace:', new Error().stack?.split('\n').slice(1, 4).join(' | '));
  });

  const res = await PdfService.generateCertificatePdf(mockData, qrBuffer);
  console.log('Result path:', res.pdfPath);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
