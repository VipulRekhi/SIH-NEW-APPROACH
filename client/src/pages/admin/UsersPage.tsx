import React, { useState, useEffect, useCallback } from 'react';
import { AdminService, type AdminUser } from '../../services/adminService';
import {
  Search,
  Plus,
  RefreshCw,
  Filter
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newFullName, setNewFullName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('technician');
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Status updating
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await AdminService.listUsers({
        page,
        limit: 20,
        search: search || undefined,
        role: roleFilter || undefined
      });
      setUsers(data.users || []);
      setPagination(
        data.pagination || {
          page,
          limit: 20,
          total: data.users?.length || 0,
          totalPages: 1
        }
      );
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      setUpdatingId(user.id);
      await AdminService.updateUserStatus(user.id, !user.is_active);
      await fetchUsers(pagination?.page || 1);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update user status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleChangeRole = async (user: AdminUser, newRoleName: string) => {
    try {
      setUpdatingId(user.id);
      await AdminService.updateUserRole(user.id, newRoleName);
      await fetchUsers(pagination?.page || 1);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update user role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await AdminService.createUser({
        fullName: newFullName,
        email: newEmail,
        password: newPassword,
        roleName: newRole
      });
      setShowCreateModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('technician');
      await fetchUsers(1);
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300">ADMIN</span>;
      case 'officer':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">OFFICER</span>;
      case 'technician':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">TECHNICIAN</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 uppercase tracking-wide">
              Administration Module
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Access Control & Role Matrix
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            User Directory & Access Control
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Institutional personnel provisioning for Technicians, Legal Metrology Officers, and Administrators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchUsers(pagination?.page || 1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by full name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Roles</option>
            <option value="technician">Technicians</option>
            <option value="officer">Officers</option>
            <option value="admin">Administrators</option>
          </select>
          <span className="text-xs text-slate-500 font-mono">
            Users: <strong>{pagination?.total ?? users.length}</strong>
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-mono tracking-wider">
              <tr>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4">Institutional Email</th>
                <th className="py-3 px-4">Role Designation</th>
                <th className="py-3 px-4">Laboratory</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Enrolled Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading user accounts...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No users matching search filters found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {u.full_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      {getRoleBadge(u.role_name)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.laboratory_name || 'Central Directorate'}
                    </td>
                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-300">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Change Role Selector */}
                        <select
                          value={u.role_name}
                          disabled={updatingId === u.id}
                          onChange={(e) => handleChangeRole(u, e.target.value)}
                          className="text-[11px] border border-slate-300 rounded px-1.5 py-1 bg-white text-slate-700 focus:outline-none"
                        >
                          <option value="technician">Technician</option>
                          <option value="officer">Officer</option>
                          <option value="admin">Admin</option>
                        </select>

                        {/* Toggle Active Status */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          disabled={updatingId === u.id}
                          className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
                            u.is_active
                              ? 'text-red-700 hover:bg-red-50 border border-red-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Provision New Metrological Account
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                &times;
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@nawi.gov.in"
                  className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Institutional Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                >
                  <option value="technician">Technician (Data entry & calculations)</option>
                  <option value="officer">Officer (Review & certificate issuance)</option>
                  <option value="admin">Admin (System administration)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs"
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
