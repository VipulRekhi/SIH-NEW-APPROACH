import { query } from '../config/db.js';
import { Laboratory } from '../types/index.js';

export class LaboratoryRepository {
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

  static async create(data: { name: string; address?: string; contact_email?: string }): Promise<Laboratory> {
    const res = await query(
      `INSERT INTO laboratories (name, address, contact_email)
       VALUES ($1, $2, $3)
       RETURNING id, name, address, contact_email, created_at, updated_at`,
      [data.name, data.address || null, data.contact_email || null]
    );
    return res.rows[0];
  }
}
