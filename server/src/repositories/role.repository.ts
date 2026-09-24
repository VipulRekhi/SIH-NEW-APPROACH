import { query } from '../config/db.js';
import { Role, UserRole } from '../types/index.js';

export class RoleRepository {
  static async findByName(name: UserRole): Promise<Role | null> {
    const res = await query(
      'SELECT id, name, description, created_at FROM roles WHERE name = $1',
      [name]
    );
    return res.rows[0] || null;
  }

  static async findById(id: number): Promise<Role | null> {
    const res = await query(
      'SELECT id, name, description, created_at FROM roles WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  static async listAll(): Promise<Role[]> {
    const res = await query('SELECT id, name, description, created_at FROM roles ORDER BY id ASC');
    return res.rows;
  }
}
