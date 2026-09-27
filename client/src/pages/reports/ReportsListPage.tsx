import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ReportService } from '../../services/reportService';
import type { Report } from '../../types/report.types';
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  Copy,
  Check,
  ShieldCheck,
  FileSpreadsheet,
  Filter
} from 'lucide-react';

export const ReportsListPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<string>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const fetchReports = useCallback(async (pageToLoad = 1) => {
    try {
      setLoading(true);
      const data = await ReportService.listReports({
        page: pageToLoad,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        regulatoryMode: modeFilter || undefined
      });
      setReports(data.reports);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, modeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReports(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchReports]);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadCertificate = async (report: Report) => {
    try {
      setDownloadingId(`${report.id}_cert`);
      await ReportService.downloadPdf(report.id, `${report.report_number}_certificate.pdf`, 'certificate');
    } catch (err) {
      alert('Failed to download Certificate PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadDetailed = async (report: Report) => {
    try {
      setDownloadingId(`${report.id}_det`);
      await ReportService.downloadPdf(report.id, `${report.report_number}_detailed.pdf`, 'detailed');
    } catch (err) {
      alert('Failed to download Detailed Report PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadExcel = async (report: Report) => {
    try {
      setDownloadingId(`${report.id}_excel`);
      await ReportService.downloadExcel(report.id, `${report.report_number}_data.xlsx`);
    } catch (err) {
      alert('Failed to download Excel test data workbook.');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            PASSED
          </span>
        );
      case 'FAILED':
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold font-mono text-red-800 bg-red-50 border border-red-300">
            <XCircle className="w-3 h-3 text-red-600" />
            FAILED
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold font-mono text-amber-800 bg-amber-50 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            REVIEW REQ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold font-mono text-slate-600 bg-slate-100 border border-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 uppercase tracking-wide">
              Official Registry
            </span>
            <span className="text-xs text-slate-500 font-mono">
              OIML R 76-1:2006
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Official Test Report & Certificate Repository
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Searchable legal-metrology archive of approved verification certificates, tamper-evident QR seals, and multi-sheet data workbooks.
          </p>
        </div>

        <Link
          to="/app/tests"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors self-start sm:self-auto"
        >
          <Scale className="w-4 h-4" />
          <span>Test Sessions</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Report #, QR ID, Serial #, Model, Officer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Results</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="REVIEW_REQUIRED">Review Required</option>
          </select>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Regulatory Modes</option>
            <option value="INITIAL_VERIFICATION">Initial Verification</option>
            <option value="TYPE_EVALUATION">Type Evaluation</option>
            <option value="SUBSEQUENT_VERIFICATION">Subsequent Verification</option>
            <option value="SERVICE_INSPECTION">Service Inspection</option>
          </select>

          <span className="text-xs text-slate-500 font-mono ml-2">
            Total: <strong>{pagination.total}</strong>
          </span>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="text-xs text-slate-500 font-medium">Searching official reports repository...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Official Reports Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once an officer approves an applicable test session, the official certificate and QR verification record will be indexed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Report Number</th>
                  <th className="py-3 px-4">QR Verification ID</th>
                  <th className="py-3 px-4">Instrument / Serial</th>
                  <th className="py-3 px-4">Mode / Personnel</th>
                  <th className="py-3 px-4">Authoritative Result</th>
                  <th className="py-3 px-4">Issued Date</th>
                  <th className="py-3 px-4 text-right">Official Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => {
                  const inst = r.instrument_snapshot || {};
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-800 block">
                          {r.report_number}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {r.laboratory_name || 'Accredited Lab'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {r.public_verification_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(r.verification_url, r.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Copy Public QR Link"
                          >
                            {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">
                          {inst.manufacturer || r.manufacturer} {inst.model_number || r.model_number}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          SN: {inst.serial_number || r.serial_number} &bull; Class {inst.accuracy_class || r.accuracy_class}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-bold block w-fit mb-0.5">
                          {r.regulatory_mode}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {r.officer_name && <span>Officer: {r.officer_name}</span>}
                          {r.technician_name && <span> &bull; Tech: {r.technician_name}</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(r.overall_status)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(r.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/public/report/${r.public_verification_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-purple-700 hover:text-white bg-purple-50 hover:bg-purple-700 rounded transition-colors"
                            title="Open Public Verification Page"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>QR</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDownloadCertificate(r)}
                            disabled={downloadingId === `${r.id}_cert`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-700 rounded border border-blue-200 transition-colors"
                            title="Download 1-page Official Certificate"
                          >
                            <Download className="w-3 h-3" />
                            <span>Cert</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadDetailed(r)}
                            disabled={downloadingId === `${r.id}_det`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 hover:text-white bg-slate-100 hover:bg-slate-700 rounded transition-colors"
                            title="Download Multi-Page Detailed Technical Report"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Report</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadExcel(r)}
                            disabled={downloadingId === `${r.id}_excel`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-700 rounded border border-emerald-200 transition-colors"
                            title="Download 12-sheet Excel Data Workbook"
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                            <span>Excel</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
