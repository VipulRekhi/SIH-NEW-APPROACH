import { api } from './api';
import type {
  Instrument,
  InstrumentFile,
  OcrResult,
  ApiResponse,
  PaginationData,
  InstrumentStatus,
  DocumentType
} from '../types';

export interface CreateInstrumentInput {
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
  notes?: string | null;
  nameplate_file_id?: string | null;
  ocr_result_id?: string | null;
}

export interface UpdateInstrumentInput {
  manufacturer?: string;
  model_number?: string;
  serial_number?: string;
  instrument_type?: string;
  accuracy_class?: string;
  max_capacity?: number;
  min_capacity?: number;
  scale_interval?: number;
  verification_scale_interval?: number;
  unit?: string;
  status?: InstrumentStatus;
  notes?: string | null;
}

export interface InstrumentListFilter {
  search?: string;
  status?: InstrumentStatus | '';
  type?: string;
  page?: number;
  limit?: number;
}

export class InstrumentService {
  static async list(filter: InstrumentListFilter = {}): Promise<{
    instruments: Instrument[];
    pagination?: PaginationData;
  }> {
    const params = new URLSearchParams();
    if (filter.search) params.append('search', filter.search);
    if (filter.status) params.append('status', filter.status);
    if (filter.type) params.append('type', filter.type);
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());

    const response = await api.get<ApiResponse<{ instruments: Instrument[] }>>(
      `/instruments?${params.toString()}`
    );

    return {
      instruments: response.data.data?.instruments || [],
      pagination: response.data.pagination
    };
  }

  static async getById(id: string): Promise<{
    instrument: Instrument;
    files: InstrumentFile[];
    ocr_history: OcrResult[];
  }> {
    const response = await api.get<ApiResponse<{
      instrument: Instrument;
      files: InstrumentFile[];
      ocr_history: OcrResult[];
    }>>(`/instruments/${id}`);

    if (!response.data.data) {
      throw new Error('Failed to load instrument details');
    }

    return response.data.data;
  }

  static async create(input: CreateInstrumentInput): Promise<Instrument> {
    const response = await api.post<ApiResponse<{ instrument: Instrument }>>(
      '/instruments',
      input
    );
    if (!response.data.data?.instrument) {
      throw new Error('Failed to create instrument');
    }
    return response.data.data.instrument;
  }

  static async update(id: string, input: UpdateInstrumentInput): Promise<Instrument> {
    const response = await api.put<ApiResponse<{ instrument: Instrument }>>(
      `/instruments/${id}`,
      input
    );
    if (!response.data.data?.instrument) {
      throw new Error('Failed to update instrument');
    }
    return response.data.data.instrument;
  }

  static async updateStatus(id: string, status: InstrumentStatus): Promise<Instrument> {
    const response = await api.patch<ApiResponse<{ instrument: Instrument }>>(
      `/instruments/${id}/status`,
      { status }
    );
    if (!response.data.data?.instrument) {
      throw new Error('Failed to update instrument status');
    }
    return response.data.data.instrument;
  }

  static async scanOcr(file: File): Promise<{
    file: InstrumentFile;
    ocr: OcrResult;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<{
      file: InstrumentFile;
      ocr: OcrResult;
    }>>('/instruments/ocr/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (!response.data.data) {
      throw new Error('OCR scanning failed');
    }

    return response.data.data;
  }

  static async uploadFile(
    instrumentId: string,
    file: File,
    documentType: DocumentType
  ): Promise<InstrumentFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    const response = await api.post<ApiResponse<{ file: InstrumentFile }>>(
      `/instruments/${instrumentId}/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (!response.data.data?.file) {
      throw new Error('File upload failed');
    }

    return response.data.data.file;
  }

  static getFileViewUrl(instrumentId: string, fileId: string): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    return `${baseUrl}/instruments/${instrumentId}/files/${fileId}/view`;
  }

  static async deleteFile(instrumentId: string, fileId: string): Promise<void> {
    await api.delete(`/instruments/${instrumentId}/files/${fileId}`);
  }
}
