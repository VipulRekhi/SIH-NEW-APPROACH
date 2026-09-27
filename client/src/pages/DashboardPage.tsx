import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatsService, type DashboardStats } from '../services/statsService';
import {
  Scale,
  FlaskConical,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  Users,
  Building2,
  Plus,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await StatsService.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const role = user?.role_name || 'technician';

  const getWorkflowBadge = (status: string) => {
    switch (status) {
      case 'OFFICIAL_REPORT_GENERATED':
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">APPROVED</span>;
      case 'SUBMITTED_FOR_REVIEW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-300">AWAITING REVIEW</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-300">UNDER REVIEW</span>;
      case 'RETURNED_FOR_CORRECTION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">RETURNED FOR CORRECTION</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-800 border border-red-300">REJECTED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">IN PROGRESS</span>;
      case 'DRAFT':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">DRAFT</span>;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'PASSED':
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            PASSED
          </span>
        );
      case 'FAILED':
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" />
            FAILED
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3" />
            REVIEW REQ
          </span>
        );
      default:
        return <span className="text-[10px] font-mono text-slate-500">{result || 'DRAFT'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome / Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 uppercase tracking-wide">
              Institutional Verification Workflow
            </span>
            <span className="text-xs text-slate-500 font-mono">
              OIML R 76-1:2006 Standard
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome, {user?.full_name}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {role === 'technician' && 'Technician Testing Console — Perform metrological tests, enter observations, calculate errors, and submit sessions for officer review.'}
            {role === 'officer' && 'Officer Verification & Approval Console — Review submitted technical evidence, verify MPE compliance, and issue tamper-evident official certificates.'}
            {role === 'admin' && 'Administrative Management Console — Oversee legal metrology laboratories, user provisioning, system parameters, and comprehensive audit logs.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {role === 'technician' && (
            <Link
              to="/app/tests/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Test Session</span>
            </Link>
          )}

          {role === 'officer' && (
            <Link
              to="/app/tests?tab=review_queue"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-amber-700 hover:bg-amber-800 rounded shadow-xs transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Open Review Queue</span>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 1. TECHNICIAN DASHBOARD VIEW                         */}
      {/* ---------------------------------------------------- */}
      {role === 'technician' && (
        <div className="space-y-6">
          {/* Technician Workflow Guideline Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-lg p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-800/80 rounded">
                <FlaskConical className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Technician Metrological Workflow
                </div>
                <div className="text-xs text-slate-200 font-medium">
                  Perform Physical Test &rarr; Enter Observations &rarr; Run OIML Calculations &rarr; Inspect Results &rarr; Submit for Review
                </div>
              </div>
            </div>
            <div className="hidden sm:block text-[11px] font-mono text-slate-300">
              Official certification authority is reserved for the Officer
            </div>
          </div>

          {/* Technician Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <Link to="/app/tests" className="block bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm rounded-lg p-3 text-center transition-all">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">My Tests</div>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{stats?.technician?.myTests ?? 0}</div>
            </Link>
            <Link to="/app/tests?workflow_status=DRAFT" className="block bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm rounded-lg p-3 text-center transition-all">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Draft</div>
              <div className="text-xl font-bold text-slate-600 mt-1 font-mono">{stats?.technician?.draft ?? 0}</div>
            </Link>
            <Link to="/app/tests?workflow_status=SUBMITTED_FOR_REVIEW" className="block bg-white border border-blue-200 hover:border-blue-400 hover:shadow-sm rounded-lg p-3 text-center bg-blue-50/40 transition-all">
              <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Awaiting Review</div>
              <div className="text-xl font-bold text-blue-700 mt-1 font-mono">{stats?.technician?.awaitingReview ?? 0}</div>
            </Link>
            <Link to="/app/tests?workflow_status=RETURNED_FOR_CORRECTION" className="block bg-white border border-amber-200 hover:border-amber-400 hover:shadow-sm rounded-lg p-3 text-center bg-amber-50/40 transition-all">
              <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Returned</div>
              <div className="text-xl font-bold text-amber-700 mt-1 font-mono">{stats?.technician?.returned ?? 0}</div>
            </Link>
            <Link to="/app/tests?workflow_status=APPROVED" className="block bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-sm rounded-lg p-3 text-center bg-emerald-50/40 transition-all">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Approved</div>
              <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">{stats?.technician?.approved ?? 0}</div>
            </Link>
            <Link to="/app/tests?status=PASSED" className="block bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-sm rounded-lg p-3 text-center transition-all">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">PASSED</div>
              <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">{stats?.technician?.passed ?? 0}</div>
            </Link>
            <Link to="/app/tests?status=FAILED" className="block bg-white border border-slate-200 hover:border-red-400 hover:shadow-sm rounded-lg p-3 text-center transition-all">
              <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">FAILED</div>
              <div className="text-xl font-bold text-red-700 mt-1 font-mono">{stats?.technician?.failed ?? 0}</div>
            </Link>
            <Link to="/app/tests?status=REVIEW_REQUIRED" className="block bg-white border border-slate-200 hover:border-amber-400 hover:shadow-sm rounded-lg p-3 text-center transition-all">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Review Req</div>
              <div className="text-xl font-bold text-amber-700 mt-1 font-mono">{stats?.technician?.reviewRequired ?? 0}</div>
            </Link>
          </div>

          {/* Active / Recent Tests Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  My Active & Recent Test Sessions
                </h3>
                <p className="text-[11px] text-slate-500">
                  Instrument tests performed under your technician account.
                </p>
              </div>
              <Link
                to="/app/tests?tab=my_tests"
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
              >
                <span>View All My Tests</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Session / ID</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Instrument / SN</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Regulatory Mode</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Test Date</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Workflow Status</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Calculated Result</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {!stats?.technician?.recentTests || stats.technician.recentTests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No test sessions recorded yet. Click "New Test Session" above to begin.
                      </td>
                    </tr>
                  ) : (
                    stats.technician.recentTests.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-blue-800">{t.session_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{t.manufacturer} {t.model_number}</div>
                          <div className="text-[11px] font-mono text-slate-500">SN: {t.serial_number}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {t.regulatory_mode}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {t.test_date ? new Date(t.test_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {getWorkflowBadge(t.workflow_status)}
                          {t.workflow_status === 'RETURNED_FOR_CORRECTION' && t.reviewer_comments && (
                            <div className="text-[10px] text-amber-800 mt-0.5 truncate max-w-xs" title={t.reviewer_comments}>
                              Note: {t.reviewer_comments}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getResultBadge(t.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/app/tests/${t.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-700 rounded transition-colors"
                          >
                            <span>Open Workspace</span>
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
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. OFFICER DASHBOARD VIEW                            */}
      {/* ---------------------------------------------------- */}
      {role === 'officer' && (
        <div className="space-y-6">
          {/* Officer Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Link to="/app/tests?workflow_status=SUBMITTED_FOR_REVIEW" className="block bg-white border border-amber-300 hover:border-amber-500 hover:shadow-sm rounded-lg p-3 text-center bg-amber-50/50 transition-all">
              <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Pending Review</div>
              <div className="text-xl font-bold text-amber-800 mt-1 font-mono">{stats?.officer?.pendingReviews ?? 0}</div>
            </Link>
            <Link to="/app/tests?workflow_status=UNDER_REVIEW" className="block bg-white border border-indigo-200 hover:border-indigo-400 hover:shadow-sm rounded-lg p-3 text-center bg-indigo-50/40 transition-all">
              <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Under Review</div>
              <div className="text-xl font-bold text-indigo-700 mt-1 font-mono">{stats?.officer?.underReview ?? 0}</div>
            </Link>
            <Link to="/app/tests?workflow_status=APPROVED" className="block bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-sm rounded-lg p-3 text-center bg-emerald-50/40 transition-all">
              <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Approved</div>
              <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">{stats?.officer?.approved ?? 0}</div>
            </Link>
            <Link to="/app/tests?workflow_status=REJECTED" className="block bg-white border border-red-200 hover:border-red-400 hover:shadow-sm rounded-lg p-3 text-center bg-red-50/40 transition-all">
              <div className="text-[10px] font-bold text-red-900 uppercase tracking-wider">Rejected</div>
              <div className="text-xl font-bold text-red-700 mt-1 font-mono">{stats?.officer?.rejected ?? 0}</div>
            </Link>
            <Link to="/app/tests?workflow_status=RETURNED_FOR_CORRECTION" className="block bg-white border border-amber-200 hover:border-amber-400 hover:shadow-sm rounded-lg p-3 text-center transition-all">
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Returned</div>
              <div className="text-xl font-bold text-amber-700 mt-1 font-mono">{stats?.officer?.returned ?? 0}</div>
            </Link>
            <Link to="/app/tests?status=PASSED" className="block bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-sm rounded-lg p-3 text-center transition-all">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Passed</div>
              <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">{stats?.officer?.passed ?? 0}</div>
            </Link>
            <Link to="/app/tests?status=FAILED" className="block bg-white border border-slate-200 hover:border-red-400 hover:shadow-sm rounded-lg p-3 text-center transition-all">
              <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Total Failed</div>
              <div className="text-xl font-bold text-red-700 mt-1 font-mono">{stats?.officer?.failed ?? 0}</div>
            </Link>
          </div>

          {/* Section: Priority Review Queue */}
          <div className="bg-white border border-amber-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-50 to-white border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-700" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Technician Submissions Requiring Official Review
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Verify raw observations, error calculations, and MPE limits before issuing official certificates.
                  </p>
                </div>
              </div>
              <Link
                to="/app/tests?tab=review_queue"
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1"
              >
                <span>Full Review Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Session / ID</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Instrument / SN</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Technician</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Submitted At</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Engine Result</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Workflow</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {!stats?.officer?.reviewQueue || stats.officer.reviewQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No submissions currently pending review in your laboratory queue.
                      </td>
                    </tr>
                  ) : (
                    stats.officer.reviewQueue.map((s: any) => (
                      <tr key={s.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-blue-800">{s.session_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{s.manufacturer} {s.model_number}</div>
                          <div className="text-[11px] font-mono text-slate-500">SN: {s.serial_number}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800">{s.technician_name}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {getResultBadge(s.status)}
                        </td>
                        <td className="px-4 py-3">
                          {getWorkflowBadge(s.workflow_status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/app/tests/${s.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded shadow-xs transition-colors"
                          >
                            <span>Inspect & Approve</span>
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

          {/* Section: Recently Issued Reports */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recently Issued Official Reports & Certificates
                </h3>
                <p className="text-[11px] text-slate-500">
                  Legal metrology certificates issued by your authority with tamper-evident QR verification.
                </p>
              </div>
              <Link
                to="/app/reports"
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
              >
                <span>View Full Repository</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Report Number</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">QR Verification ID</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Instrument / SN</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Issued Date</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Overall Result</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {!stats?.officer?.recentReports || stats.officer.recentReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No official reports issued yet.
                      </td>
                    </tr>
                  ) : (
                    stats.officer.recentReports.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-800">
                          {r.report_number}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-purple-800">
                          {r.public_verification_id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{r.manufacturer} {r.model_number}</div>
                          <div className="text-[11px] font-mono text-slate-500">SN: {r.serial_number}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {getResultBadge(r.overall_status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/public/report/${r.public_verification_id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:text-white bg-purple-50 hover:bg-purple-700 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Public QR</span>
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
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. ADMIN DASHBOARD VIEW                              */}
      {/* ---------------------------------------------------- */}
      {role === 'admin' && (
        <div className="space-y-6">
          {/* Admin Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Users</span>
                <Users className="w-4 h-4 text-purple-700" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{stats?.admin?.totalUsers ?? 0}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {stats?.admin?.technicians ?? 0} Technicians &bull; {stats?.admin?.officers ?? 0} Officers
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Laboratories</span>
                <Building2 className="w-4 h-4 text-blue-700" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{stats?.admin?.laboratories ?? 0}</div>
              <div className="text-[11px] text-slate-500 mt-1">Accredited testing centers</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Instruments</span>
                <Scale className="w-4 h-4 text-cyan-700" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{stats?.admin?.instruments ?? 0}</div>
              <div className="text-[11px] text-slate-500 mt-1">Registered NAWI devices</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Test Sessions</span>
                <FlaskConical className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{stats?.admin?.testSessions ?? 0}</div>
              <div className="text-[11px] text-slate-500 mt-1">{stats?.admin?.pendingReviews ?? 0} Pending Officer Review</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Official Reports</span>
                <FileText className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{stats?.admin?.officialReports ?? 0}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {stats?.admin?.passedReports ?? 0} Passed &bull; {stats?.admin?.failedReports ?? 0} Failed
              </div>
            </div>
          </div>

          {/* Admin Fast Navigation Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              to="/app/users"
              className="bg-white border border-slate-200 hover:border-purple-300 rounded-lg p-4 shadow-xs flex items-center justify-between transition-colors group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-purple-700">User Administration</div>
                <div className="text-xs text-slate-500 mt-0.5">Manage accounts, roles, activations</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700" />
            </Link>

            <Link
              to="/app/laboratories"
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-lg p-4 shadow-xs flex items-center justify-between transition-colors group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-blue-700">Laboratory Network</div>
                <div className="text-xs text-slate-500 mt-0.5">Manage facility nodes and locations</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700" />
            </Link>

            <Link
              to="/app/audit-logs"
              className="bg-white border border-slate-200 hover:border-indigo-300 rounded-lg p-4 shadow-xs flex items-center justify-between transition-colors group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-indigo-700">System Audit Trail</div>
                <div className="text-xs text-slate-500 mt-0.5">Immutable traceability & activity log</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-700" />
            </Link>

            <Link
              to="/app/settings"
              className="bg-white border border-slate-200 hover:border-slate-400 rounded-lg p-4 shadow-xs flex items-center justify-between transition-colors group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-slate-800">System Parameters</div>
                <div className="text-xs text-slate-500 mt-0.5">OIML tolerances & node config</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800" />
            </Link>
          </div>

          {/* Recent Audit Trail Stream */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Live System Audit Trail
                </h3>
                <p className="text-[11px] text-slate-500">
                  Chronological security and metrological action event stream.
                </p>
              </div>
              <Link
                to="/app/audit-logs"
                className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1"
              >
                <span>View Full Audit Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Timestamp</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Action</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Entity</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">User / Role</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {!stats?.admin?.recentAuditLogs || stats.admin.recentAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    stats.admin.recentAuditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono font-bold text-purple-800 text-[11px]">{log.action}</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">
                          {log.entity_type}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-slate-900">{log.user_name || 'System'}</span>
                          {log.user_role && (
                            <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase">
                              {log.user_role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px] truncate max-w-md">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
