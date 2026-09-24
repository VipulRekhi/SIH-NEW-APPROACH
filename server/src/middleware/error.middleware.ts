import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Log server-side for diagnostics
  console.error(`[Error Handler] ${req.method} ${req.url} - ${err.message}`, err);

  // Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  // PostgreSQL Unique Violation (23505)
  if (err.code === '23505') {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'A record with this information already exists.'
      }
    });
    return;
  }

  // PostgreSQL Foreign Key Violation (23503)
  if (err.code === '23503') {
    res.status(400).json({
      success: false,
      error: {
        code: 'FOREIGN_KEY_VIOLATION',
        message: 'Referenced related entity does not exist.'
      }
    });
    return;
  }

  // Generic internal server error (never leak raw SQL or stack traces)
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please contact the administrator.',
      ...(config.nodeEnv === 'development' ? { debug: err.message } : {})
    }
  });
}
