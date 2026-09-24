import { query } from '../config/db.js';
import { User, SafeUser } from '../types/index.js';

export class UserRepository {
  static async findByEmailWithPassword(email: string): Promise<User | null> {
    const res = await query(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.role_id, u.laboratory_id, u.is_active, u.created_at, u.updated_at,
              r.name as role_name, l.name as laboratory_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN laboratories l ON u.laboratory_id = l.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email.trim()]
    );
    return res.rows[0] || null;
  }

  static async findByIdSafe(id: string): Promise<SafeUser | null> {
    const res = await query(
      `SELECT u.id, u.full_name, u.email, u.role_id, u.laboratory_id, u.is_active, u.created_at, u.updated_at,
              r.name as role_name, l.name as laboratory_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN laboratories l ON u.laboratory_id = l.id
       WHERE u.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async existsByEmail(email: string): Promise<boolean> {
    const res = await query(
      'SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    roleId: number;
    laboratoryId?: string | null;
  }): Promise<SafeUser> {
    const res = await query(
      `INSERT INTO users (full_name, email, password_hash, role_id, laboratory_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role_id, laboratory_id, is_active, created_at, updated_at`,
      [data.fullName.trim(), data.email.toLowerCase().trim(), data.passwordHash, data.roleId, data.laboratoryId || null]
    );

    const createdUser = res.rows[0];
    const fullUser = await this.findByIdSafe(createdUser.id);
    return fullUser!;
  }

  static async listAllSafe(): Promise<SafeUser[]> {
    const res = await query(
      `SELECT u.id, u.full_name, u.email, u.role_id, u.laboratory_id, u.is_active, u.created_at, u.updated_at,
              r.name as role_name, l.name as laboratory_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN laboratories l ON u.laboratory_id = l.id
       ORDER BY u.created_at DESC`
    );
    return res.rows;
  }
}
