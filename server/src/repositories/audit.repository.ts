import { query } from '../config/db.js';
import { AuditLog } from '../types/index.js';

export interface AuditLogWithUser extends AuditLog {
  user_name?: string;
  user_email?: string;
  role_name?: string;
}

export class AuditRepository {
  static async log(data: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: any;
  }): Promise<AuditLog> {
    const res = await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, action, entity_type, entity_id, metadata, created_at`,
      [data.userId || null, data.action, data.entityType, data.entityId, data.metadata ? JSON.stringify(data.metadata) : null]
    );
    return res.rows[0];
  }

  static async listByEntity(entityType: string, entityId: string): Promise<AuditLogWithUser[]> {
    const res = await query(
      `SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
              u.full_name as user_name, u.email as user_email, r.name as role_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE a.entity_type = $1 AND a.entity_id = $2
       ORDER BY a.created_at DESC`,
      [entityType, entityId]
    );
    return res.rows;
  }

  static async listAll(params: {
    action?: string;
    entityType?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogWithUser[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.action) {
      conditions.push(`a.action ILIKE $${idx++}`);
      values.push(`%${params.action}%`);
    }

    if (params.entityType) {
      conditions.push(`a.entity_type = $${idx++}`);
      values.push(params.entityType);
    }

    if (params.userId) {
      conditions.push(`a.user_id = $${idx++}`);
      values.push(params.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    const countRes = await query(
      `SELECT COUNT(*)::int as total FROM audit_logs a ${whereClause}`,
      values
    );

    const listRes = await query(
      `SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
              u.full_name as user_name, u.email as user_email, r.name as role_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return {
      logs: listRes.rows,
      total: countRes.rows[0]?.total || 0
    };
  }
}
