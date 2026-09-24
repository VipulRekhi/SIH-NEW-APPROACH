import { query } from '../config/db.js';
import { InstrumentFile, DocumentType } from '../types/index.js';

export class FileRepository {
  static async create(data: {
    instrumentId?: string | null;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    documentType: DocumentType;
    uploadedBy: string;
  }): Promise<InstrumentFile> {
    const res = await query(
      `INSERT INTO instrument_files (instrument_id, file_name, file_path, file_type, file_size, document_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, instrument_id, file_name, file_path, file_type, file_size, document_type, uploaded_by, created_at`,
      [
        data.instrumentId || null,
        data.fileName,
        data.filePath,
        data.fileType,
        data.fileSize,
        data.documentType,
        data.uploadedBy
      ]
    );
    return res.rows[0];
  }

  static async findById(id: string): Promise<InstrumentFile | null> {
    const res = await query(
      `SELECT f.id, f.instrument_id, f.file_name, f.file_path, f.file_type, f.file_size, f.document_type, f.uploaded_by, f.created_at,
              u.full_name as uploader_name
       FROM instrument_files f
       LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async listByInstrument(instrumentId: string): Promise<InstrumentFile[]> {
    const res = await query(
      `SELECT f.id, f.instrument_id, f.file_name, f.file_path, f.file_type, f.file_size, f.document_type, f.uploaded_by, f.created_at,
              u.full_name as uploader_name
       FROM instrument_files f
       LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.instrument_id = $1
       ORDER BY f.created_at DESC`,
      [instrumentId]
    );
    return res.rows;
  }

  static async linkToInstrument(fileId: string, instrumentId: string): Promise<void> {
    await query(
      `UPDATE instrument_files SET instrument_id = $1 WHERE id = $2`,
      [instrumentId, fileId]
    );
  }

  static async delete(id: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM instrument_files WHERE id = $1 RETURNING id`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
