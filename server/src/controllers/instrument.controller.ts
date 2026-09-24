import { Response, NextFunction } from 'express';
import { InstrumentService } from '../services/instrument.service.js';
import { AuthenticatedRequest, ApiResponse, DocumentType, InstrumentStatus } from '../types/index.js';
import { AppError } from '../middleware/error.middleware.js';

export class InstrumentController {
  static async createInstrument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const {
        manufacturer,
        model_number,
        serial_number,
        instrument_type,
        accuracy_class,
        max_capacity,
        min_capacity,
        scale_interval,
        verification_scale_interval,
        unit,
        notes,
        nameplate_file_id,
        ocr_result_id
      } = req.body;

      const instrument = await InstrumentService.createInstrument(
        {
          manufacturer,
          modelNumber: model_number,
          serialNumber: serial_number,
          instrumentType: instrument_type,
          accuracyClass: accuracy_class,
          maxCapacity: Number(max_capacity),
          minCapacity: Number(min_capacity),
          scaleInterval: Number(scale_interval),
          verificationScaleInterval: Number(verification_scale_interval),
          unit,
          notes,
          nameplate_file_id,
          ocr_result_id
        },
        req.user
      );

      const response: ApiResponse = {
        success: true,
        data: { instrument }
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async listInstruments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const { search, status, type, page, limit } = req.query;

      const result = await InstrumentService.listInstruments(
        {
          search: search as string,
          status: status as InstrumentStatus,
          instrumentType: type as string,
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 20
        },
        req.user
      );

      const response: ApiResponse = {
        success: true,
        data: { instruments: result.items },
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

  static async getInstrument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const details = await InstrumentService.getInstrumentById(id, req.user);

      const response: ApiResponse = {
        success: true,
        data: details
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateInstrument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const {
        manufacturer,
        model_number,
        serial_number,
        instrument_type,
        accuracy_class,
        max_capacity,
        min_capacity,
        scale_interval,
        verification_scale_interval,
        unit,
        status,
        notes
      } = req.body;

      const updated = await InstrumentService.updateInstrument(
        id,
        {
          manufacturer,
          modelNumber: model_number,
          serialNumber: serial_number,
          instrumentType: instrument_type,
          accuracyClass: accuracy_class,
          maxCapacity: max_capacity !== undefined ? Number(max_capacity) : undefined,
          minCapacity: min_capacity !== undefined ? Number(min_capacity) : undefined,
          scaleInterval: scale_interval !== undefined ? Number(scale_interval) : undefined,
          verificationScaleInterval: verification_scale_interval !== undefined ? Number(verification_scale_interval) : undefined,
          unit,
          status,
          notes
        },
        req.user
      );

      const response: ApiResponse = {
        success: true,
        data: { instrument: updated }
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const { status } = req.body;

      const updated = await InstrumentService.updateStatus(id, status, req.user);

      const response: ApiResponse = {
        success: true,
        data: { instrument: updated }
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async uploadFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }
      if (!req.file) {
        throw new AppError('No image file provided for upload.', 400, 'FILE_MISSING');
      }

      const { id } = req.params;
      const documentType = (req.body.document_type || 'INSTRUMENT_PHOTO') as DocumentType;

      const fileRecord = await InstrumentService.uploadInstrumentFile(
        id,
        req.file,
        documentType,
        req.user
      );

      const response: ApiResponse = {
        success: true,
        data: { file: fileRecord }
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async viewFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const { fileId } = req.params;
      const { file, absolutePath } = await InstrumentService.getFileForViewing(fileId, req.user);

      res.setHeader('Content-Type', file.file_type);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.file_name)}"`);
      res.sendFile(absolutePath);
    } catch (err) {
      next(err);
    }
  }

  static async deleteFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const { fileId } = req.params;
      await InstrumentService.deleteFile(fileId, req.user);

      const response: ApiResponse = {
        success: true,
        data: { message: 'File deleted successfully.' }
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async scanOcr(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }
      if (!req.file) {
        throw new AppError('No nameplate photograph uploaded for OCR analysis.', 400, 'FILE_MISSING');
      }

      const result = await InstrumentService.scanNameplateOcr(req.file, req.user);

      const response: ApiResponse = {
        success: true,
        data: {
          file: result.file,
          ocr: result.ocr
        }
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
