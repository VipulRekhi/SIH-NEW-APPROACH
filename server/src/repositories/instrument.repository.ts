import { query } from '../config/db.js';
import { Instrument, InstrumentStatus } from '../types/index.js';

export interface CreateInstrumentData {
  laboratoryId: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  instrumentType: string;
  accuracyClass: string;
  maxCapacity: number;
  minCapacity: number;
  scaleInterval: number;
  verificationScaleInterval: number;
  unit: string;
  status?: InstrumentStatus;
  notes?: string | null;
  createdBy: string;
}

export interface UpdateInstrumentData {
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  instrumentType?: string;
  accuracyClass?: string;
  maxCapacity?: number;
  minCapacity?: number;
  scaleInterval?: number;
  verificationScaleInterval?: number;
  unit?: string;
  status?: InstrumentStatus;
  notes?: string | null;
}

export interface InstrumentFilter {
  search?: string;
  status?: InstrumentStatus;
  instrumentType?: string;
  laboratoryId?: string;
  page?: number;
  limit?: number;
}

export class InstrumentRepository {
  static async create(data: CreateInstrumentData): Promise<Instrument> {
    const res = await query(
      `INSERT INTO instruments (
        laboratory_id, manufacturer, model_number, serial_number, instrument_type,
        accuracy_class, max_capacity, min_capacity, scale_interval, verification_scale_interval,
        unit, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, laboratory_id, manufacturer, model_number, serial_number, instrument_type,
                accuracy_class, max_capacity, min_capacity, scale_interval, verification_scale_interval,
                unit, status, notes, created_by, created_at, updated_at`,
      [
        data.laboratoryId,
        data.manufacturer.trim(),
        data.modelNumber.trim(),
        data.serialNumber.trim(),
        data.instrumentType.trim(),
        data.accuracyClass.trim(),
        data.maxCapacity,
        data.minCapacity,
        data.scaleInterval,
        data.verificationScaleInterval,
        data.unit.trim().toLowerCase(),
        data.status || 'ACTIVE',
        data.notes || null,
        data.createdBy
      ]
    );

    const created = await this.findById(res.rows[0].id);
    return created!;
  }

  static async findById(id: string): Promise<Instrument | null> {
    const res = await query(
      `SELECT i.*, 
              l.name as laboratory_name,
              u.full_name as creator_name
       FROM instruments i
       JOIN laboratories l ON i.laboratory_id = l.id
       JOIN users u ON i.created_by = u.id
       WHERE i.id = $1`,
      [id]
    );
    if (!res.rows[0]) return null;

    const row = res.rows[0];
    return {
      ...row,
      max_capacity: parseFloat(row.max_capacity),
      min_capacity: parseFloat(row.min_capacity),
      scale_interval: parseFloat(row.scale_interval),
      verification_scale_interval: parseFloat(row.verification_scale_interval)
    };
  }

  static async existsBySerialInLab(
    labId: string,
    manufacturer: string,
    serialNumber: string,
    excludeId?: string
  ): Promise<boolean> {
    let sql = `SELECT 1 FROM instruments WHERE laboratory_id = $1 AND LOWER(manufacturer) = LOWER($2) AND LOWER(serial_number) = LOWER($3)`;
    const params: any[] = [labId, manufacturer.trim(), serialNumber.trim()];
    if (excludeId) {
      sql += ` AND id != $4`;
      params.push(excludeId);
    }
    const res = await query(sql, params);
    return (res.rowCount ?? 0) > 0;
  }

  static async update(id: string, data: UpdateInstrumentData): Promise<Instrument | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.manufacturer !== undefined) {
      fields.push(`manufacturer = $${idx++}`);
      values.push(data.manufacturer.trim());
    }
    if (data.modelNumber !== undefined) {
      fields.push(`model_number = $${idx++}`);
      values.push(data.modelNumber.trim());
    }
    if (data.serialNumber !== undefined) {
      fields.push(`serial_number = $${idx++}`);
      values.push(data.serialNumber.trim());
    }
    if (data.instrumentType !== undefined) {
      fields.push(`instrument_type = $${idx++}`);
      values.push(data.instrumentType.trim());
    }
    if (data.accuracyClass !== undefined) {
      fields.push(`accuracy_class = $${idx++}`);
      values.push(data.accuracyClass.trim());
    }
    if (data.maxCapacity !== undefined) {
      fields.push(`max_capacity = $${idx++}`);
      values.push(data.maxCapacity);
    }
    if (data.minCapacity !== undefined) {
      fields.push(`min_capacity = $${idx++}`);
      values.push(data.minCapacity);
    }
    if (data.scaleInterval !== undefined) {
      fields.push(`scale_interval = $${idx++}`);
      values.push(data.scaleInterval);
    }
    if (data.verificationScaleInterval !== undefined) {
      fields.push(`verification_scale_interval = $${idx++}`);
      values.push(data.verificationScaleInterval);
    }
    if (data.unit !== undefined) {
      fields.push(`unit = $${idx++}`);
      values.push(data.unit.trim().toLowerCase());
    }
    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(data.notes || null);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `UPDATE instruments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id`;
    const res = await query(sql, values);
    if (!res.rows[0]) return null;

    return this.findById(id);
  }

  static async updateStatus(id: string, status: InstrumentStatus): Promise<Instrument | null> {
    const res = await query(
      `UPDATE instruments SET status = $1 WHERE id = $2 RETURNING id`,
      [status, id]
    );
    if (!res.rows[0]) return null;
    return this.findById(id);
  }

  static async list(filter: InstrumentFilter): Promise<{ items: Instrument[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filter.laboratoryId) {
      conditions.push(`i.laboratory_id = $${idx++}`);
      params.push(filter.laboratoryId);
    }

    if (filter.status) {
      conditions.push(`i.status = $${idx++}`);
      params.push(filter.status);
    }

    if (filter.instrumentType) {
      conditions.push(`i.instrument_type ILIKE $${idx++}`);
      params.push(`%${filter.instrumentType}%`);
    }

    if (filter.search) {
      const term = `%${filter.search.trim()}%`;
      conditions.push(`(i.manufacturer ILIKE $${idx} OR i.model_number ILIKE $${idx} OR i.serial_number ILIKE $${idx})`);
      params.push(term);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countRes = await query(
      `SELECT COUNT(*)::int as total FROM instruments i ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));
    const offset = (page - 1) * limit;

    const listSql = `
      SELECT i.*, 
             l.name as laboratory_name,
             u.full_name as creator_name
      FROM instruments i
      JOIN laboratories l ON i.laboratory_id = l.id
      JOIN users u ON i.created_by = u.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    params.push(limit, offset);
    const listRes = await query(listSql, params);

    const items = listRes.rows.map((row) => ({
      ...row,
      max_capacity: parseFloat(row.max_capacity),
      min_capacity: parseFloat(row.min_capacity),
      scale_interval: parseFloat(row.scale_interval),
      verification_scale_interval: parseFloat(row.verification_scale_interval)
    }));

    return { items, total };
  }
}
