import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { InstrumentService } from '../../services/instrumentService';
import type { Instrument, PaginationData, InstrumentStatus } from '../../types';
import {
  Scale,
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  ScanLine,
  Building2,
  AlertCircle
} from 'lucide-react';

export const InstrumentListPage: React.FC = () => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [pagination, setPagination] = useState<PaginationData | undefined>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<InstrumentStatus | ''>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchInstruments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await InstrumentService.list({
        search: searchTerm,
        status: statusFilter,
        page: currentPage,
        limit: 10
      });
      setInstruments(data.instruments);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load instruments.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInstruments();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchInstruments]);

  const statusBadge = (status: InstrumentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Under Review
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
    }
  };

  const classBadge = (accClass: string) => {
    return (
      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
        Class {accClass}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
              Phase 2 Active
            </span>
            <span className="text-xs text-slate-500 font-mono">
              OIML R-76 Instrument Registry
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Instrument Management
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Registered Non-Automatic Weighing Instruments, verified metrological specifications, and nameplates.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/app/instruments/new?mode=ocr"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan Nameplate (OCR)</span>
          </Link>
          <Link
            to="/app/instruments/new?mode=manual"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
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
            id="instrument-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search manufacturer, model, or serial number..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
          </div>
          <select
            id="instrument-status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Instruments Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Equipment / Manufacturer
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Serial Number
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Capacity Range
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Verification Interval (e)
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
                      <span>Loading instrument repository...</span>
                    </div>
                  </td>
                </tr>
              ) : instruments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <Scale className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">No instruments found</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {searchTerm || statusFilter
                          ? 'Try adjusting your search criteria.'
                          : 'Get started by creating your first instrument record or scanning a nameplate.'}
                      </p>
                      <Link
                        to="/app/instruments/new?mode=ocr"
                        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors"
                      >
                        <ScanLine className="w-3.5 h-3.5" />
                        <span>Scan First Nameplate</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                instruments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{inst.manufacturer}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Model: {inst.model_number}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">
                      {inst.serial_number}
                    </td>
                    <td className="px-4 py-3">
                      {classBadge(inst.accuracy_class)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      <span>{inst.min_capacity}</span>
                      <span className="text-slate-400 mx-1">to</span>
                      <span className="font-semibold">{inst.max_capacity} {inst.unit}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      e = {inst.verification_scale_interval} {inst.unit}
                      <span className="text-[10px] text-slate-400 block font-sans">
                        (d = {inst.scale_interval} {inst.unit})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(inst.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/app/instruments/${inst.id}`}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="View Specifications & History"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/app/instruments/${inst.id}/edit`}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                          title="Edit Instrument"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{instruments.length}</span> of{' '}
              <span className="font-semibold">{pagination.total}</span> instruments
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                {currentPage} / {pagination.totalPages}
              </span>
              <button
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legal Metrology Note */}
      <div className="p-3 bg-slate-100 rounded border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
        <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span>
          Instruments registered here are isolated by accredited laboratory and will serve as direct inputs for OIML R-76 calibration testing in Phase 3.
        </span>
      </div>
    </div>
  );
};
