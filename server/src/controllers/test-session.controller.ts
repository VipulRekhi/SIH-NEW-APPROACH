import { Response, NextFunction } from 'express';
import { TestSessionService } from '../services/test-session.service.js';
import { TestSessionRepository } from '../repositories/test-session.repository.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { AppError } from '../middleware/error.middleware.js';

export class TestSessionController {
  static async createSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');

      const {
        instrumentId,
        regulatoryMode,
        testDate,
        environmentalConditions,
        referenceStandards,
        selectedTestTypeIds,
        notes
      } = req.body;

      if (!instrumentId) {
        throw new AppError('Instrument ID is required to initiate test session.', 400, 'FIELD_MISSING');
      }

      const result = await TestSessionService.createSession(
        {
          instrumentId,
          regulatoryMode,
          testDate,
          environmentalConditions,
          referenceStandards,
          selectedTestTypeIds,
          notes
        },
        req.user
      );

      const response: ApiResponse = {
        success: true,
        data: result
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async listSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');

      const { status, search, page, limit } = req.query;
      const result = await TestSessionService.listSessions(
        {
          status: status as string,
          search: search as string,
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 20
        },
        req.user
      );

      const response: ApiResponse = {
        success: true,
        data: { sessions: result.items },
        pagination: {
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (limit ? parseInt(limit as string, 10) : 20))
        }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { id } = req.params;

      const result = await TestSessionService.getSessionById(id, req.user);
      const response: ApiResponse = {
        success: true,
        data: result
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { id } = req.params;
      const { environmentalConditions, referenceStandards, notes } = req.body;

      const updated = await TestSessionService.updateSession(
        id,
        { environmentalConditions, referenceStandards, notes },
        req.user
      );

      const response: ApiResponse = {
        success: true,
        data: { session: updated }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { id } = req.params;
      const { status } = req.body;

      if (!status) throw new AppError('Status is required', 400, 'FIELD_MISSING');

      const updated = await TestSessionService.updateSessionStatus(id, status, req.user);
      const response: ApiResponse = {
        success: true,
        data: { session: updated }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async generatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { id } = req.params;

      const plan = await TestSessionService.generateRecommendedPlan(id, req.user);
      const response: ApiResponse = {
        success: true,
        data: { plan }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async addObservation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { testId } = req.params;
      const {
        sequenceNo,
        direction,
        loadValue,
        loadUnit,
        indicationValue,
        indicationUnit,
        additionalLoad,
        zeroError,
        position,
        repeatNumber,
        remarks
      } = req.body;

      if (sequenceNo === undefined || loadValue === undefined || indicationValue === undefined) {
        throw new AppError('Sequence number, load value, and indication value are required.', 400, 'FIELD_MISSING');
      }

      const observation = await TestSessionService.addObservation(
        testId,
        {
          sequenceNo: Number(sequenceNo),
          direction,
          loadValue: Number(loadValue),
          loadUnit,
          indicationValue: Number(indicationValue),
          indicationUnit,
          additionalLoad: additionalLoad !== undefined && additionalLoad !== null ? Number(additionalLoad) : null,
          zeroError: zeroError !== undefined && zeroError !== null ? Number(zeroError) : null,
          position,
          repeatNumber: repeatNumber ? Number(repeatNumber) : null,
          remarks
        },
        req.user
      );

      const response: ApiResponse = {
        success: true,
        data: { observation }
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getObservations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { testId } = req.params;

      const result = await TestSessionService.getObservations(testId, req.user);
      const response: ApiResponse = {
        success: true,
        data: result
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async deleteObservation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { testId, obsId } = req.params;

      await TestSessionService.deleteObservation(testId, obsId, req.user);
      const response: ApiResponse = {
        success: true,
        data: { message: 'Observation deleted successfully.' }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async calculateTest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { testId } = req.params;

      const result = await TestSessionService.calculateTest(testId, req.user);
      const response: ApiResponse = {
        success: true,
        data: result
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async evaluateSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { id } = req.params;

      const evaluationReport = await TestSessionService.evaluateSessionOverallStatus(id);
      const details = await TestSessionService.getSessionById(id, req.user);

      const response: ApiResponse = {
        success: true,
        data: {
          overallStatus: typeof evaluationReport === 'object' ? evaluationReport.overallStatus : evaluationReport,
          evaluationReport,
          session: details.session,
          tests: details.tests
        }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async evaluateApplicability(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { id } = req.params;

      const evaluationReport = await TestSessionService.reEvaluateApplicabilityForSession(id);
      const details = await TestSessionService.getSessionById(id, req.user);

      const response: ApiResponse = {
        success: true,
        data: {
          evaluationReport,
          session: details.session,
          tests: details.tests
        }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getTestTypes(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const testTypes = await TestSessionRepository.getAllTestTypes();
      const response: ApiResponse = {
        success: true,
        data: { testTypes }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getRuleRegistry(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rules = await TestSessionRepository.getAllRules();
      const response: ApiResponse = {
        success: true,
        data: { rules }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
