import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TestSessionService } from '../../services/testSessionService';
import type { TestSession, SessionStatus } from '../../types/test.types';
import {
  FlaskConical,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  ArrowRight
} from 'lucide-react';

export const TestSessionListPage: React.FC = () => {
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TestSessionService.listSessions({
        search: searchTerm,
        status: statusFilter
      });
      setSessions(data.sessions);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to retrieve test sessions.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchSessions]);

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            PASSED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            FAILED
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            REVIEW REQUIRED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            IN PROGRESS
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            DRAFT
          </span>
        );
    }
  };

  const getRegulatoryModeBadge = (mode: string) => {
    switch (mode) {
      case 'TYPE_EVALUATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-800 border border-purple-200">TYPE EVALUATION</span>;
      case 'INITIAL_VERIFICATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">INITIAL VERIFICATION</span>;
      case 'SUBSEQUENT_VERIFICATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">SUBSEQUENT VERIFICATION</span>;
      case 'SERVICE_INSPECTION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">SERVICE (2x MPE)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">{mode}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 uppercase tracking-wide">
              Phase 3 Active
            </span>
            <span className="text-xs text-slate-500 font-mono">
              OIML R 76-1:2006 Testing & Calculation Engine
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Metrological Test Sessions
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Standardized legal-metrology testing, deterministic MPE calculations, turning points, and compliance audit trail.
          </p>
        </div>

        <div>
          <Link
            to="/app/tests/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Test Session</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search session ID, serial number, manufacturer..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW_REQUIRED">Review Required</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Sessions Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Session Reference
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Instrument / Serial
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Regulatory Mode
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Test Date
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-700 rounded-full animate-spin" />
                      <span>Loading test sessions...</span>
                    </div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <FlaskConical className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">No test sessions found</p>
                      <p className="text-slate-500 text-xs mt-1">
                        Select a verified instrument and start an OIML R-76 testing session.
                      </p>
                      <Link
                        to="/app/tests/new"
                        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Test Session</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-blue-800">{s.session_number}</div>
                      <div className="text-[10px] text-slate-500">Tech: {s.technician_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.manufacturer} {s.model_number}</div>
                      <div className="text-[11px] font-mono text-slate-500">SN: {s.serial_number}</div>
                    </td>
                    <td className="px-4 py-3">
                      {getRegulatoryModeBadge(s.regulatory_mode)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {new Date(s.test_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700">
                          {s.completed_tests ?? 0} / {s.total_tests ?? 0}
                        </span>
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{
                              width: `${s.total_tests ? ((s.completed_tests || 0) / s.total_tests) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/app/tests/${s.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-700 rounded transition-colors"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
