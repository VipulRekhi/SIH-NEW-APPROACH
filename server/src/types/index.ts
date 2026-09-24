import { Request } from 'express';

export type UserRole = 'admin' | 'officer' | 'technician';

export interface User {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role_id: number;
  role_name?: UserRole;
  laboratory_id?: string | null;
  laboratory_name?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type SafeUser = Omit<User, 'password_hash'>;

export interface Role {
  id: number;
  name: UserRole;
  description?: string;
  created_at: Date;
}

export interface Laboratory {
  id: string;
  name: string;
  address?: string | null;
  contact_email?: string | null;
  created_at: Date;
  updated_at: Date;
}

export type InstrumentStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
export type DocumentType = 'NAMEPLATE' | 'INSTRUMENT_PHOTO' | 'SUPPORTING_DOCUMENT';
export type OcrStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVIEW_REQUIRED';

export interface Instrument {
  id: string;
  laboratory_id: string;
  laboratory_name?: string;
  manufacturer: string;
  model_number: string;
  serial_number: string;
  instrument_type: string;
  accuracy_class: string;
  max_capacity: number;
  min_capacity: number;
  scale_interval: number;
  verification_scale_interval: number;
  unit: string;
  status: InstrumentStatus;
  notes?: string | null;
  device_configuration?: Record<string, any>;
  created_by: string;
  creator_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface InstrumentFile {
  id: string;
  instrument_id?: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  document_type: DocumentType;
  uploaded_by: string;
  uploader_name?: string;
  created_at: Date;
}

export interface OcrResult {
  id: string;
  instrument_id?: string | null;
  file_id: string;
  raw_text: string;
  extracted_data: any;
  confidence_data?: any;
  ocr_status: OcrStatus;
  created_by: string;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: any;
  created_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  laboratoryId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
