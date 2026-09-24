import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"]
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const createLabSchema = z.object({
  name: z.string().trim().min(2, 'Laboratory name must be at least 2 characters'),
  address: z.string().trim().optional(),
  contact_email: z.string().trim().email('Invalid contact email').optional().or(z.literal(''))
});

export const createInstrumentSchema = z.object({
  manufacturer: z.string().trim().min(1, 'Manufacturer is required'),
  model_number: z.string().trim().min(1, 'Model number is required'),
  serial_number: z.string().trim().min(1, 'Serial number is required'),
  instrument_type: z.string().trim().min(1, 'Instrument type is required'),
  accuracy_class: z.enum(['I', 'II', 'III', 'IIII'], {
    errorMap: () => ({ message: 'Accuracy class must be one of: I, II, III, IIII' })
  }),
  max_capacity: z.coerce.number().positive('Maximum capacity must be greater than zero'),
  min_capacity: z.coerce.number().min(0, 'Minimum capacity cannot be negative'),
  scale_interval: z.coerce.number().positive('Scale interval (d) must be greater than zero'),
  verification_scale_interval: z.coerce.number().positive('Verification scale interval (e) must be greater than zero'),
  unit: z.string().trim().min(1, 'Measurement unit is required').default('kg'),
  notes: z.string().trim().optional().nullable(),
  nameplate_file_id: z.string().uuid().optional().nullable(),
  ocr_result_id: z.string().uuid().optional().nullable()
}).refine((data) => data.max_capacity >= data.min_capacity, {
  message: 'Maximum capacity cannot be less than minimum capacity',
  path: ['max_capacity']
});

export const updateInstrumentSchema = z.object({
  manufacturer: z.string().trim().min(1).optional(),
  model_number: z.string().trim().min(1).optional(),
  serial_number: z.string().trim().min(1).optional(),
  instrument_type: z.string().trim().min(1).optional(),
  accuracy_class: z.enum(['I', 'II', 'III', 'IIII']).optional(),
  max_capacity: z.coerce.number().positive().optional(),
  min_capacity: z.coerce.number().min(0).optional(),
  scale_interval: z.coerce.number().positive().optional(),
  verification_scale_interval: z.coerce.number().positive().optional(),
  unit: z.string().trim().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_REVIEW']).optional(),
  notes: z.string().trim().optional().nullable()
}).refine((data) => {
  if (data.max_capacity !== undefined && data.min_capacity !== undefined) {
    return data.max_capacity >= data.min_capacity;
  }
  return true;
}, {
  message: 'Maximum capacity cannot be less than minimum capacity',
  path: ['max_capacity']
});

export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_REVIEW'], {
    errorMap: () => ({ message: 'Status must be ACTIVE, INACTIVE, or UNDER_REVIEW' })
  })
});

export function validateBody(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstError = err.errors[0];
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: firstError.message,
            details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
          }
        });
        return;
      }
      next(err);
    }
  };
}
