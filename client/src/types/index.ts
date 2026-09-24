export type UserRole = 'admin' | 'officer' | 'technician';
export type InstrumentStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
export type DocumentType = 'NAMEPLATE' | 'INSTRUMENT_PHOTO' | 'SUPPORTING_DOCUMENT';
export type OcrStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVIEW_REQUIRED';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role_id: number;
  role_name: UserRole;
  laboratory_id?: string | null;
  laboratory_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
  updated_at: string;
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
  created_at: string;
}

export interface ExtractedInstrumentData {
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  instrument_type: string | null;
  accuracy_class: string | null;
  max_capacity: number | null;
  min_capacity: number | null;
  scale_interval: number | null;
  verification_scale_interval: number | null;
  unit: string | null;
}

export interface OcrResult {
  id: string;
  instrument_id?: string | null;
  file_id: string;
  raw_text: string;
  extracted_data: ExtractedInstrumentData;
  confidence_data?: Record<string, number>;
  ocr_status: OcrStatus;
  created_by: string;
  created_at: string;
}

export interface AuthResponseData {
  token: string;
  user: User;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: PaginationData;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
