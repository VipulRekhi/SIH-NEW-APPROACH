import { Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { ReportService } from '../services/report.service.js';
import { AppError } from '../middleware/error.middleware.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

export class ReportController {
  /**
   * Generates official test report for a finalized session (Authenticated).
   */
  static async generateReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      if (req.user.role !== 'officer') {
        throw new AppError(
          'Access denied: Only an authorized Officer can issue official reports and certificates. Technicians and Administrators do not hold metrological approval authority.',
          403,
          'FORBIDDEN'
        );
      }

      const { testSessionId } = req.params;
      const { origin, forceRegenerate } = req.body || {};

      // Dynamic origin determination
      const detectedOrigin = origin || req.headers.origin || (req.headers.referer ? new URL(req.headers.referer as string).origin : undefined);

      const report = await ReportService.generateReport(
        testSessionId,
        req.user,
        detectedOrigin,
        Boolean(forceRegenerate)
      );

      const response: ApiResponse = {
        success: true,
        data: { report }
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves an authenticated report by ID.
   */
  static async getReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const report = await ReportService.getReportById(id, req.user);

      const response: ApiResponse = {
        success: true,
        data: { report }
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves an authenticated report for a test session.
   */
  static async getReportBySession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { sessionId } = req.params;
      const report = await ReportService.getReportBySessionId(sessionId, req.user);

      const response: ApiResponse = {
        success: true,
        data: { report }
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Downloads official PDF or Excel report for an authenticated user.
   */
  static async downloadPdf(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const rawType = (req.query.type as string) || 'certificate';
      const type = rawType === 'excel' ? 'excel' : (rawType === 'detailed' ? 'detailed' : 'certificate');
      const { filePath, fileName } = await ReportService.getAuthenticatedPdfFile(id, req.user, type);

      const contentType = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Dedicated Excel test data workbook download for authenticated users.
   */
  static async downloadExcel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const { filePath, fileName } = await ReportService.getAuthenticatedPdfFile(id, req.user, 'excel');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lists generated reports for authenticated user.
   */
  static async listReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const search = req.query.search as string;
      const status = req.query.status as string;
      const overallStatus = req.query.overallStatus as string;
      const regulatoryMode = req.query.regulatoryMode as string;
      const instrumentId = req.query.instrumentId as string;
      const laboratoryId = req.query.laboratoryId as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const data = await ReportService.listReports(req.user, {
        page,
        limit,
        search,
        status,
        overallStatus,
        regulatoryMode,
        instrumentId,
        laboratoryId,
        startDate,
        endDate
      });

      const response: ApiResponse = {
        success: true,
        data: { reports: data.reports },
        pagination: data.pagination
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public report verification lookup (UNAUTHENTICATED).
   */
  static async getPublicVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { verificationId } = req.params;
      const verificationData = await ReportService.getPublicVerification(verificationId);

      const response: ApiResponse = {
        success: true,
        data: { verification: verificationData }
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public PDF report download (UNAUTHENTICATED).
   */
  static async downloadPublicPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { verificationId } = req.params;
      const rawType = (req.query.type as string) || 'certificate';
      const type = rawType === 'excel' ? 'excel' : (rawType === 'detailed' ? 'detailed' : 'certificate');
      const { filePath, fileName } = await ReportService.getPublicPdfFile(verificationId, type);

      const contentType = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Dedicated Public Excel workbook download (UNAUTHENTICATED).
   */
  static async downloadPublicExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { verificationId } = req.params;
      const { filePath, fileName } = await ReportService.getPublicPdfFile(verificationId, 'excel');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public QR code image stream (UNAUTHENTICATED).
   */
  static async getPublicQr(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { verificationId } = req.params;
      const verificationData = await ReportService.getPublicVerification(verificationId);

      const qrPng = await QRCode.toBuffer(verificationData.verificationUrl, {
        type: 'png',
        margin: 1,
        width: 300,
        errorCorrectionLevel: 'H'
      });

      res.setHeader('Content-Type', 'image/png');
      res.send(qrPng);
    } catch (err) {
      next(err);
    }
  }
}
