import { api } from './api';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role_id: number;
  role_name: string;
  laboratory_id?: string | null;
  laboratory_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminLaboratory {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  is_active: boolean;
  instruments_count?: number;
  users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  laboratory_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: any;
  ip_address?: string | null;
  created_at: string;
}

export class AdminService {
  static async getStats(): Promise<any> {
    const res = await api.get('/admin/stats');
    return res.data.data;
  }

  static async listUsers(params?: { search?: string; role?: string; page?: number; limit?: number }): Promise<{
    users: AdminUser[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const res = await api.get('/admin/users', { params });
    const users = res.data.data?.users || [];
    const pagination = res.data.pagination || {
      page: params?.page || 1,
      limit: params?.limit || 20,
      total: users.length,
      totalPages: Math.max(1, Math.ceil(users.length / (params?.limit || 20)))
    };
    return { users, pagination };
  }

  static async createUser(data: {
    fullName: string;
    email: string;
    password: string;
    roleName: string;
    laboratoryId?: string | null;
  }): Promise<AdminUser> {
    const res = await api.post('/admin/users', data);
    return res.data.data.user;
  }

  static async updateUserStatus(userId: string, isActive: boolean): Promise<AdminUser> {
    const res = await api.patch(`/admin/users/${userId}/status`, { isActive });
    return res.data.data.user;
  }

  static async updateUserRole(userId: string, roleName: string): Promise<AdminUser> {
    const res = await api.patch(`/admin/users/${userId}/role`, { roleName });
    return res.data.data.user;
  }

  static async listLaboratories(): Promise<AdminLaboratory[]> {
    const res = await api.get('/admin/laboratories');
    return res.data.data.laboratories;
  }

  static async createLaboratory(data: {
    name: string;
    code: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Promise<AdminLaboratory> {
    const res = await api.post('/admin/laboratories', data);
    return res.data.data.laboratory;
  }

  static async updateLaboratory(
    id: string,
    data: {
      name?: string;
      code?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      contactEmail?: string;
      contactPhone?: string;
      isActive?: boolean;
    }
  ): Promise<AdminLaboratory> {
    const res = await api.put(`/admin/laboratories/${id}`, data);
    return res.data.data.laboratory;
  }

  static async listAuditLogs(params?: { search?: string; page?: number; limit?: number }): Promise<{
    logs: AdminAuditLog[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const res = await api.get('/admin/audit-logs', { params });
    const logs = res.data.data?.logs || [];
    const pagination = res.data.pagination || {
      page: params?.page || 1,
      limit: params?.limit || 50,
      total: logs.length,
      totalPages: Math.max(1, Math.ceil(logs.length / (params?.limit || 50)))
    };
    return { logs, pagination };
  }
}
