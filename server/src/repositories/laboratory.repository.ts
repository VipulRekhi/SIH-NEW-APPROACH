import { query } from '../config/db.js';
import { Laboratory } from '../types/index.js';

export class LaboratoryRepository {
  static async create(data: { name: string; address?: string; contact_email?: string }): Promise<Laboratory> {
    const res = await query(
      `INSERT INTO laboratories (name, address, contact_email)
       VALUES ($1, $2, $3)
       RETURNING id, name, address, contact_email, created_at, updated_at`,
      [data.name, data.address || null, data.contact_email || null]
    );
    return res.rows[0];
  }

  static async findById(id: string): Promise<Laboratory | null> {
    const res = await query(
      'SELECT id, name, address, contact_email, created_at, updated_at FROM laboratories WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  static async listAll(): Promise<Laboratory[]> {
    const res = await query(
      'SELECT id, name, address, contact_email, created_at, updated_at FROM laboratories ORDER BY name ASC'
    );
    return res.rows;
  }

  static async listAllWithCounts(): Promise<any[]> {
    const res = await query(
      `SELECT l.*,
              (SELECT COUNT(*)::int FROM users u WHERE u.laboratory_id = l.id) as user_count,
              (SELECT COUNT(*)::int FROM instruments i WHERE i.laboratory_id = l.id) as instrument_count,
              (SELECT COUNT(*)::int FROM test_sessions ts WHERE ts.laboratory_id = l.id) as session_count
       FROM laboratories l
       ORDER BY l.name ASC`
    );
    return res.rows;
  }

  static async update(id: string, data: { name?: string; address?: string; contact_email?: string }): Promise<Laboratory | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${idx++}`);
      params.push(data.address);
    }
    if (data.contact_email !== undefined) {
      fields.push(`contact_email = $${idx++}`);
      params.push(data.contact_email);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const sql = `UPDATE laboratories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  }
}
