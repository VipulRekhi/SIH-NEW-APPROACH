import { query } from '../config/db.js';
import { OcrResult, OcrStatus } from '../types/index.js';

export class OcrRepository {
  static async create(data: {
    instrumentId?: string | null;
    fileId: string;
    rawText: string;
    extractedData: any;
    confidenceData?: any;
    ocrStatus: OcrStatus;
    createdBy: string;
  }): Promise<OcrResult> {
    const res = await query(
      `INSERT INTO ocr_results (instrument_id, file_id, raw_text, extracted_data, confidence_data, ocr_status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, instrument_id, file_id, raw_text, extracted_data, confidence_data, ocr_status, created_by, created_at`,
      [
        data.instrumentId || null,
        data.fileId,
        data.rawText,
        JSON.stringify(data.extractedData),
        data.confidenceData ? JSON.stringify(data.confidenceData) : null,
        data.ocrStatus,
        data.createdBy
      ]
    );
    return res.rows[0];
  }

  static async findById(id: string): Promise<OcrResult | null> {
    const res = await query(
      `SELECT id, instrument_id, file_id, raw_text, extracted_data, confidence_data, ocr_status, created_by, created_at
       FROM ocr_results
       WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByFileId(fileId: string): Promise<OcrResult | null> {
    const res = await query(
      `SELECT id, instrument_id, file_id, raw_text, extracted_data, confidence_data, ocr_status, created_by, created_at
       FROM ocr_results
       WHERE file_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [fileId]
    );
    return res.rows[0] || null;
  }

  static async listByInstrument(instrumentId: string): Promise<OcrResult[]> {
    const res = await query(
      `SELECT id, instrument_id, file_id, raw_text, extracted_data, confidence_data, ocr_status, created_by, created_at
       FROM ocr_results
       WHERE instrument_id = $1
       ORDER BY created_at DESC`,
      [instrumentId]
    );
    return res.rows;
  }

  static async linkToInstrument(ocrId: string, instrumentId: string): Promise<void> {
    await query(
      `UPDATE ocr_results SET instrument_id = $1 WHERE id = $2`,
      [instrumentId, ocrId]
    );
  }
}
