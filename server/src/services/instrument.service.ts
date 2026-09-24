import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { InstrumentRepository, CreateInstrumentData, UpdateInstrumentData, InstrumentFilter } from '../repositories/instrument.repository.js';
import { FileRepository } from '../repositories/file.repository.js';
import { OcrRepository } from '../repositories/ocr.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { LaboratoryRepository } from '../repositories/laboratory.repository.js';
import { OcrService } from './ocr/ocr.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { Instrument, InstrumentFile, OcrResult, InstrumentStatus, JwtPayload, DocumentType } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage');

export class InstrumentService {
  /**
   * Helper to resolve the user's active laboratory ID
   */
  private static async resolveUserLabId(user: JwtPayload): Promise<string> {
    if (user.laboratoryId) {
      return user.laboratoryId;
    }
    const dbUser = await UserRepository.findByIdSafe(user.userId);
    if (dbUser?.laboratory_id) {
      return dbUser.laboratory_id;
    }
    // Fallback for admin or unassigned users: use first available laboratory
    const labs = await LaboratoryRepository.listAll();
    if (labs.length === 0) {
      throw new AppError('No registered laboratory found in system. Please create a laboratory first.', 400, 'NO_LABORATORY');
    }
    return labs[0].id;
  }

  static async createInstrument(
    input: Omit<CreateInstrumentData, 'laboratoryId' | 'createdBy'> & {
      nameplate_file_id?: string | null;
      ocr_result_id?: string | null;
    },
    user: JwtPayload
  ): Promise<Instrument> {
    const labId = await this.resolveUserLabId(user);

    // Duplicate check
    const exists = await InstrumentRepository.existsBySerialInLab(
      labId,
      input.manufacturer,
      input.serialNumber
    );
    if (exists) {
      throw new AppError(
        `An instrument with serial number "${input.serialNumber}" by manufacturer "${input.manufacturer}" already exists in this laboratory.`,
        409,
        'DUPLICATE_INSTRUMENT'
      );
    }

    const instrument = await InstrumentRepository.create({
      ...input,
      laboratoryId: labId,
      createdBy: user.userId
    });

    // Link uploaded nameplate if created through OCR workflow
    if (input.nameplate_file_id) {
      await FileRepository.linkToInstrument(input.nameplate_file_id, instrument.id);
    }

    // Link OCR result if created through OCR workflow
    if (input.ocr_result_id) {
      await OcrRepository.linkToInstrument(input.ocr_result_id, instrument.id);
    }

    // Audit log
    await AuditRepository.log({
      userId: user.userId,
      action: 'INSTRUMENT_CREATED',
      entityType: 'INSTRUMENT',
      entityId: instrument.id,
      metadata: {
        manufacturer: instrument.manufacturer,
        model_number: instrument.model_number,
        serial_number: instrument.serial_number,
        created_via_ocr: !!input.ocr_result_id
      }
    });

    return instrument;
  }

  static async getInstrumentById(id: string, user: JwtPayload): Promise<{
    instrument: Instrument;
    files: InstrumentFile[];
    ocr_history: OcrResult[];
  }> {
    const instrument = await InstrumentRepository.findById(id);
    if (!instrument) {
      throw new AppError('Instrument not found.', 404, 'INSTRUMENT_NOT_FOUND');
    }

    // Laboratory isolation
    if (user.role !== 'admin' && user.laboratoryId && instrument.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied. You do not have permission to view this laboratory instrument.', 403, 'FORBIDDEN');
    }

    const files = await FileRepository.listByInstrument(id);
    const ocr_history = await OcrRepository.listByInstrument(id);

    return { instrument, files, ocr_history };
  }

  static async updateInstrument(
    id: string,
    data: UpdateInstrumentData,
    user: JwtPayload
  ): Promise<Instrument> {
    const existing = await InstrumentRepository.findById(id);
    if (!existing) {
      throw new AppError('Instrument not found.', 404, 'INSTRUMENT_NOT_FOUND');
    }

    // Laboratory isolation
    if (user.role !== 'admin' && user.laboratoryId && existing.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied. You cannot modify instruments from another laboratory.', 403, 'FORBIDDEN');
    }

    // Check duplicate if serial or manufacturer changed
    const checkMfg = data.manufacturer || existing.manufacturer;
    const checkSerial = data.serialNumber || existing.serial_number;
    if (data.serialNumber || data.manufacturer) {
      const duplicate = await InstrumentRepository.existsBySerialInLab(
        existing.laboratory_id,
        checkMfg,
        checkSerial,
        id
      );
      if (duplicate) {
        throw new AppError('Another instrument in this laboratory already uses this serial number.', 409, 'DUPLICATE_INSTRUMENT');
      }
    }

    const updated = await InstrumentRepository.update(id, data);
    if (!updated) {
      throw new AppError('Failed to update instrument.', 500, 'UPDATE_FAILED');
    }

    await AuditRepository.log({
      userId: user.userId,
      action: 'INSTRUMENT_UPDATED',
      entityType: 'INSTRUMENT',
      entityId: id,
      metadata: { changed_fields: Object.keys(data) }
    });

    return updated;
  }

  static async updateStatus(id: string, status: InstrumentStatus, user: JwtPayload): Promise<Instrument> {
    const existing = await InstrumentRepository.findById(id);
    if (!existing) {
      throw new AppError('Instrument not found.', 404, 'INSTRUMENT_NOT_FOUND');
    }

    if (user.role !== 'admin' && user.laboratoryId && existing.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied.', 403, 'FORBIDDEN');
    }

    const updated = await InstrumentRepository.updateStatus(id, status);
    if (!updated) {
      throw new AppError('Failed to update status.', 500, 'UPDATE_FAILED');
    }

    await AuditRepository.log({
      userId: user.userId,
      action: 'STATUS_UPDATED',
      entityType: 'INSTRUMENT',
      entityId: id,
      metadata: { old_status: existing.status, new_status: status }
    });

    return updated;
  }

  static async listInstruments(filter: InstrumentFilter, user: JwtPayload) {
    const effectiveFilter: InstrumentFilter = { ...filter };
    // Enforce laboratory isolation for non-admin users
    if (user.role !== 'admin') {
      const labId = await this.resolveUserLabId(user);
      effectiveFilter.laboratoryId = labId;
    }

    return InstrumentRepository.list(effectiveFilter);
  }

  static async uploadInstrumentFile(
    instrumentId: string,
    file: Express.Multer.File,
    documentType: DocumentType,
    user: JwtPayload
  ): Promise<InstrumentFile> {
    const instrument = await InstrumentRepository.findById(instrumentId);
    if (!instrument) {
      throw new AppError('Instrument not found.', 404, 'INSTRUMENT_NOT_FOUND');
    }

    if (user.role !== 'admin' && user.laboratoryId && instrument.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied.', 403, 'FORBIDDEN');
    }

    // Move file from temp to instruments directory
    const destDir = path.join(STORAGE_DIR, 'instruments', instrumentId);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, file.filename);
    fs.renameSync(file.path, destPath);

    const relativePath = path.join('instruments', instrumentId, file.filename).replace(/\\/g, '/');

    const fileRecord = await FileRepository.create({
      instrumentId,
      fileName: file.originalname,
      filePath: relativePath,
      fileType: file.mimetype,
      fileSize: file.size,
      documentType,
      uploadedBy: user.userId
    });

    await AuditRepository.log({
      userId: user.userId,
      action: 'FILE_UPLOADED',
      entityType: 'FILE',
      entityId: fileRecord.id,
      metadata: { instrument_id: instrumentId, document_type: documentType, file_name: file.originalname }
    });

    return fileRecord;
  }

  static async getFileForViewing(fileId: string, user: JwtPayload): Promise<{
    file: InstrumentFile;
    absolutePath: string;
  }> {
    const file = await FileRepository.findById(fileId);
    if (!file) {
      throw new AppError('File not found.', 404, 'FILE_NOT_FOUND');
    }

    if (file.instrument_id) {
      const instrument = await InstrumentRepository.findById(file.instrument_id);
      if (instrument && user.role !== 'admin' && user.laboratoryId && instrument.laboratory_id !== user.laboratoryId) {
        throw new AppError('Access denied.', 403, 'FORBIDDEN');
      }
    }

    const absolutePath = path.resolve(STORAGE_DIR, file.file_path);
    // Path traversal check
    if (!absolutePath.startsWith(STORAGE_DIR) || !fs.existsSync(absolutePath)) {
      throw new AppError('Physical file could not be located on storage node.', 404, 'FILE_NOT_FOUND');
    }

    return { file, absolutePath };
  }

  static async deleteFile(fileId: string, user: JwtPayload): Promise<void> {
    const file = await FileRepository.findById(fileId);
    if (!file) {
      throw new AppError('File not found.', 404, 'FILE_NOT_FOUND');
    }

    if (file.instrument_id) {
      const instrument = await InstrumentRepository.findById(file.instrument_id);
      if (instrument && user.role !== 'admin' && user.laboratoryId && instrument.laboratory_id !== user.laboratoryId) {
        throw new AppError('Access denied.', 403, 'FORBIDDEN');
      }
    }

    const absolutePath = path.resolve(STORAGE_DIR, file.file_path);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (_) {}
    }

    await FileRepository.delete(fileId);
  }

  static async scanNameplateOcr(
    file: Express.Multer.File,
    user: JwtPayload
  ): Promise<{
    file: InstrumentFile;
    ocr: OcrResult;
  }> {
    const relativePath = path.join('temp', 'ocr', file.filename).replace(/\\/g, '/');

    // Create file record
    const fileRecord = await FileRepository.create({
      instrumentId: null,
      fileName: file.originalname,
      filePath: relativePath,
      fileType: file.mimetype,
      fileSize: file.size,
      documentType: 'NAMEPLATE',
      uploadedBy: user.userId
    });

    // Execute local OCR processing
    const absolutePath = path.resolve(STORAGE_DIR, relativePath);
    const ocrResult = await OcrService.processImage(absolutePath);

    // Persist OCR result
    const savedOcr = await OcrRepository.create({
      instrumentId: null,
      fileId: fileRecord.id,
      rawText: ocrResult.raw_text,
      extractedData: ocrResult.extracted_data,
      confidenceData: ocrResult.confidence_data,
      ocrStatus: ocrResult.ocr_status,
      createdBy: user.userId
    });

    await AuditRepository.log({
      userId: user.userId,
      action: 'OCR_SCANNED',
      entityType: 'OCR',
      entityId: savedOcr.id,
      metadata: { file_id: fileRecord.id, status: ocrResult.ocr_status }
    });

    return {
      file: fileRecord,
      ocr: savedOcr
    };
  }
}
