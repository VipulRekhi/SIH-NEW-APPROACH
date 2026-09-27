import React, { useState, useEffect, useCallback } from 'react';
import { AdminService, type AdminAuditLog } from '../../services/adminService';
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await AdminService.listAuditLogs({
        page,
        limit: 50,
        search: search || undefined
      });
      setLogs(data.logs || []);
      setPagination(
        data.pagination || {
          page,
          limit: 50,
          total: data.logs?.length || 0,
          totalPages: 1
        }
      );
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const getActionBadge = (action: string) => {
    if (action.includes('APPROVED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">APPROVED</span>;
    }
    if (action.includes('REJECTED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-300">REJECTED</span>;
    }
    if (action.includes('RETURNED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">RETURNED</span>;
    }
    if (action.includes('SUBMITTED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300">SUBMITTED</span>;
    }
    if (action.includes('REPORT_GENERATED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-900 border border-purple-300">REPORT GENERATED</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">{action}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 uppercase tracking-wide">
              Traceability & Compliance
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Immutable Metrological Ledger
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            System Audit Trail & Metrological History
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Traceable log of all user logins, observation entries, test calculations, submissions, officer returns, rejections, and approvals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchLogs(pagination?.page || 1)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, user, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
          />
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Events Indexed: <strong>{pagination?.total ?? logs.length}</strong>
        </span>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-mono tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">User / Operator</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Details Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading audit ledger...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    No audit records matching query found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpand(log.id)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-bold text-[11px]">
                          {log.entity_type}
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-900">
                          {log.user_name || 'System / Batch'}
                        </td>
                        <td className="py-3 px-4 uppercase text-[10px] text-slate-500">
                          {log.user_role || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] truncate max-w-xs font-sans">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={7} className="p-4 border-t border-slate-200">
                            <div className="bg-slate-900 text-emerald-400 rounded-lg p-3 text-[11px] font-mono overflow-x-auto border border-slate-800 space-y-2">
                              <div>
                                <span className="text-slate-400 font-bold uppercase">Entity ID:</span> {log.entity_id || 'N/A'}
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold uppercase">Operator Email:</span> {log.user_email || 'N/A'}
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold uppercase">Full Metadata Payload:</span>
                                <pre className="mt-1 whitespace-pre-wrap">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
