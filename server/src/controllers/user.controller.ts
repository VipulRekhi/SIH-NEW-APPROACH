import { Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

export class UserController {
  static async getUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await UserService.listUsers();
      const response: ApiResponse = {
        success: true,
        data: { users }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
