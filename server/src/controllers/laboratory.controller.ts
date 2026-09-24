import { Response, NextFunction } from 'express';
import { LaboratoryService } from '../services/laboratory.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

export class LaboratoryController {
  static async getLaboratories(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const laboratories = await LaboratoryService.listLaboratories();
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
      const lab = await LaboratoryService.createLaboratory({ name, address, contact_email });
      const response: ApiResponse = {
        success: true,
        data: { laboratory: lab }
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }
}
