import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

// Authenticated Report Routes (mounted at /api/reports)
export const reportRoutes = Router();

reportRoutes.post('/generate/:testSessionId', authenticateToken, ReportController.generateReport);
reportRoutes.get('/', authenticateToken, ReportController.listReports);
reportRoutes.get('/session/:sessionId', authenticateToken, ReportController.getReportBySession);
reportRoutes.get('/:id', authenticateToken, ReportController.getReport);
reportRoutes.get('/:id/pdf', authenticateToken, ReportController.downloadPdf);
reportRoutes.get('/:id/excel', authenticateToken, ReportController.downloadExcel);

// Public Verification Routes (mounted at /api/public/reports) - NO AUTHENTICATION REQUIRED
export const publicReportRoutes = Router();

publicReportRoutes.get('/:verificationId', ReportController.getPublicVerification);
publicReportRoutes.get('/:verificationId/pdf', ReportController.downloadPublicPdf);
publicReportRoutes.get('/:verificationId/excel', ReportController.downloadPublicExcel);
publicReportRoutes.get('/:verificationId/qr', ReportController.getPublicQr);

export default reportRoutes;
