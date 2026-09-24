import { query } from '../config/db.js';
import { AuditLog } from '../types/index.js';

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

  static async listByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const res = await query(
      `SELECT id, user_id, action, entity_type, entity_id, metadata, created_at
       FROM audit_logs
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entityType, entityId]
    );
    return res.rows;
  }
}
