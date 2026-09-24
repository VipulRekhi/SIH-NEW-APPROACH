import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { full_name, email, password } = req.body;
      const result = await AuthService.register({ full_name, email, password });

      const response: ApiResponse = {
        success: true,
        data: {
          token: result.token,
          user: result.user
        }
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });

      const response: ApiResponse = {
        success: true,
        data: {
          token: result.token,
          user: result.user
        }
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const user = await AuthService.getCurrentUser(req.user.userId);

      const response: ApiResponse = {
        success: true,
        data: { user }
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async logout(_req: AuthenticatedRequest, res: Response): Promise<void> {
    // JWT is stateless; client removes stored token from client storage
    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully.'
      }
    });
  }
}
