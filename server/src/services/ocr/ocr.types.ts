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

export interface OcrProcessingResult {
  raw_text: string;
  extracted_data: ExtractedInstrumentData;
  confidence_data: Record<string, number>;
  ocr_status: 'COMPLETED' | 'REVIEW_REQUIRED' | 'FAILED';
  error_message?: string;
}
