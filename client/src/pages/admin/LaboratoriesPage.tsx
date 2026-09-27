import React, { useState, useEffect } from 'react';
import { AdminService, type AdminLaboratory } from '../../services/adminService';
import {
  Building2,
  Plus,
  MapPin,
  Mail,
  Phone,
  RefreshCw
} from 'lucide-react';

export const LaboratoriesPage: React.FC = () => {
  const [laboratories, setLaboratories] = useState<AdminLaboratory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Create Lab Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchLabs = async () => {
    try {
      setLoading(true);
      const labs = await AdminService.listLaboratories();
      setLaboratories(labs);
    } catch (err) {
      console.error('Failed to load laboratories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await AdminService.createLaboratory({
        name,
        code,
        address,
        city,
        state,
        contactEmail,
        contactPhone
      });
      setShowCreateModal(false);
      setName('');
      setCode('');
      setAddress('');
      setCity('');
      setState('');
      setContactEmail('');
      setContactPhone('');
      await fetchLabs();
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create laboratory.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 uppercase tracking-wide">
              Infrastructure Registry
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Accredited Facilities
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Legal Metrology Laboratories & Verification Centers
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Regional testing facilities authorized for OIML R-76 verification and calibration testing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLabs}
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
            <span>Register Facility</span>
          </button>
        </div>
      </div>

      {/* Laboratories Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-2">
          <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs text-slate-500 font-medium">Loading laboratory facilities...</span>
        </div>
      ) : laboratories.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white border border-slate-200 rounded-lg">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Laboratories Registered</h3>
          <p className="text-xs text-slate-500">Register regional legal metrology test laboratories to assign instruments and personnel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {laboratories.map((lab) => (
            <div key={lab.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {lab.name}
                      </h4>
                      <span className="text-[11px] font-mono text-blue-700 font-bold">
                        Code: {lab.code}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    Active
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  {(lab.city || lab.state) && (
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{lab.city ? `${lab.city}, ` : ''}{lab.state || ''}</span>
                    </div>
                  )}

                  {lab.contact_email && (
                    <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{lab.contact_email}</span>
                    </div>
                  )}

                  {lab.contact_phone && (
                    <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{lab.contact_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Instruments</span>
                  <span className="text-base font-bold font-mono text-slate-900">{lab.instruments_count ?? 0}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Personnel</span>
                  <span className="text-base font-bold font-mono text-slate-900">{lab.users_count ?? 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE LAB MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Register Legal Metrology Facility
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

            <form onSubmit={handleCreateLab} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Laboratory Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. National Physical Laboratory"
                  className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Facility Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. NPL-DL-01"
                  className="w-full border border-slate-300 rounded p-2 text-slate-900 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New Delhi"
                    className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">State / UT</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Delhi"
                    className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="lab@nawi.gov.in"
                  className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91-11-23456789"
                  className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
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
                  {creating ? 'Registering...' : 'Register Laboratory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
