import { Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/user.repository.js';
import { RoleRepository } from '../repositories/role.repository.js';
import { LaboratoryRepository } from '../repositories/laboratory.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { hashPassword } from '../utils/password.js';
import { query } from '../config/db.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { AppError } from '../middleware/error.middleware.js';

export class AdminController {
  // USER MANAGEMENT
  static async getUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await UserRepository.listAllSafe();
      const response: ApiResponse = {
        success: true,
        data: { users },
        pagination: {
          page: 1,
          limit: Math.max(users.length, 20),
          total: users.length,
          totalPages: 1
        }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fullName, email, password, role, laboratoryId } = req.body;

      if (!fullName || !email || !password || !role) {
        throw new AppError('Full name, email, password, and role are required.', 400, 'FIELDS_MISSING');
      }

      const emailTrimmed = email.trim().toLowerCase();
      const existing = await UserRepository.existsByEmail(emailTrimmed);
      if (existing) {
        throw new AppError('A user with this email address already exists.', 409, 'EMAIL_EXISTS');
      }

      const roleRecord = await RoleRepository.findByName(role);
      if (!roleRecord) {
        throw new AppError(`Invalid role "${role}". Valid roles are admin, officer, technician.`, 400, 'INVALID_ROLE');
      }

      const passwordHash = await hashPassword(password);
      const newUser = await UserRepository.create({
        fullName,
        email: emailTrimmed,
        passwordHash,
        roleId: roleRecord.id,
        laboratoryId: laboratoryId || null
      });

      await AuditRepository.log({
        userId: req.user?.userId,
        action: 'ADMIN_USER_CREATED',
        entityType: 'USER',
        entityId: newUser.id,
        metadata: { email: newUser.email, role: newUser.role_name }
      });

      const response: ApiResponse = {
        success: true,
        data: { user: newUser }
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async toggleUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (isActive === undefined) {
        throw new AppError('isActive boolean is required.', 400, 'FIELD_MISSING');
      }

      const updated = await UserRepository.updateStatus(id, Boolean(isActive));
      if (!updated) {
        throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
      }

      await AuditRepository.log({
        userId: req.user?.userId,
        action: 'ADMIN_USER_STATUS_UPDATED',
        entityType: 'USER',
        entityId: id,
        metadata: { is_active: isActive }
      });

      const response: ApiResponse = {
        success: true,
        data: { user: updated }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        throw new AppError('Role name is required.', 400, 'FIELD_MISSING');
      }

      const roleRecord = await RoleRepository.findByName(role);
      if (!roleRecord) {
        throw new AppError(`Role "${role}" does not exist.`, 400, 'INVALID_ROLE');
      }

      const updated = await UserRepository.updateRole(id, roleRecord.id);
      if (!updated) {
        throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
      }

      await AuditRepository.log({
        userId: req.user?.userId,
        action: 'ADMIN_USER_ROLE_UPDATED',
        entityType: 'USER',
        entityId: id,
        metadata: { role }
      });

      const response: ApiResponse = {
        success: true,
        data: { user: updated }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  // LABORATORY MANAGEMENT
  static async getLaboratories(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const laboratories = await LaboratoryRepository.listAllWithCounts();
      const response: ApiResponse = {
        success: true,
        data: { laboratories }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async createLaboratory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, address, contact_email } = req.body;
      if (!name || !name.trim()) {
        throw new AppError('Laboratory name is required.', 400, 'FIELD_MISSING');
      }

      const lab = await LaboratoryRepository.create({
        name: name.trim(),
        address: address ? address.trim() : undefined,
        contact_email: contact_email ? contact_email.trim() : undefined
      });

      await AuditRepository.log({
        userId: req.user?.userId,
        action: 'ADMIN_LABORATORY_CREATED',
        entityType: 'LABORATORY',
        entityId: lab.id,
        metadata: { name: lab.name }
      });

      const response: ApiResponse = {
        success: true,
        data: { laboratory: lab }
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateLaboratory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, address, contact_email } = req.body;

      const lab = await LaboratoryRepository.update(id, { name, address, contact_email });
      if (!lab) {
        throw new AppError('Laboratory not found.', 404, 'LAB_NOT_FOUND');
      }

      await AuditRepository.log({
        userId: req.user?.userId,
        action: 'ADMIN_LABORATORY_UPDATED',
        entityType: 'LABORATORY',
        entityId: id,
        metadata: { name, address }
      });

      const response: ApiResponse = {
        success: true,
        data: { laboratory: lab }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  // AUDIT LOGS
  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { action, entityType, userId, page, limit } = req.query;
      const pageNum = page ? parseInt(page as string, 10) : 1;
      const limitNum = limit ? parseInt(limit as string, 10) : 30;
      const offset = (pageNum - 1) * limitNum;

      const result = await AuditRepository.listAll({
        action: action as string,
        entityType: entityType as string,
        userId: userId as string,
        limit: limitNum,
        offset
      });

      const response: ApiResponse = {
        success: true,
        data: { logs: result.logs },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum)
        }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  // SYSTEM STATS / DIAGNOSTICS
  static async getSystemStats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rulesCount = await query(`SELECT COUNT(*)::int as count FROM test_rule_registry`);
      const testTypesCount = await query(`SELECT COUNT(*)::int as count FROM test_types`);
      const instrumentsCount = await query(`SELECT COUNT(*)::int as count FROM instruments`);
      const sessionsCount = await query(`SELECT COUNT(*)::int as count FROM test_sessions`);
      const reportsCount = await query(`SELECT COUNT(*)::int as count FROM reports`);
      const observationsCount = await query(`SELECT COUNT(*)::int as count FROM test_observations`);
      const resultsCount = await query(`SELECT COUNT(*)::int as count FROM test_results`);
      const usersCount = await query(`SELECT COUNT(*)::int as count FROM users`);

      const response: ApiResponse = {
        success: true,
        data: {
          system: {
            regulation: 'OIML R 76-1:2006 / OIML R 76-2:2007',
            precisionEngine: 'Decimal.js arbitrary-precision',
            qrStandard: 'RFC-4648 Base64URL Tamper-Evident ID',
            pdfEngine: 'PDFKit Double-Buffer Strict Page-Budget',
            excelEngine: 'ExcelJS Metrological 12-Sheet Workbook'
          },
          counts: {
            rules: rulesCount.rows[0].count,
            testTypes: testTypesCount.rows[0].count,
            instruments: instrumentsCount.rows[0].count,
            sessions: sessionsCount.rows[0].count,
            reports: reportsCount.rows[0].count,
            observations: observationsCount.rows[0].count,
            results: resultsCount.rows[0].count,
            users: usersCount.rows[0].count
          }
        }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async resetDemoData(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { resetDemoDatabase } = await import('../scripts/reset-demo-data.js');
      const metrics = await resetDemoDatabase();
      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Demo database reset successfully with 5 canonical test sessions.',
          metrics
        }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
