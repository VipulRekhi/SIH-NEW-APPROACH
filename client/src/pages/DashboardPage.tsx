import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Server,
  Database,
  CheckCircle2,
  Clock,
  ShieldAlert,
  FileCheck2
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [apiHealth, setApiHealth] = useState<{
    status: string;
    database: string;
    environment: string;
  } | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.data?.success) {
          setApiHealth(res.data.details);
        }
      } catch (e) {
        console.error('Health check failed', e);
      }
    };
    fetchHealth();
  }, []);

  const roadmapPhases = [
    {
      num: 1,
      title: 'Foundation & Authentication',
      status: 'completed',
      desc: 'Local PostgreSQL, Express JWT, RBAC & Core UI Shell'
    },
    {
      num: 2,
      title: 'Instrument + OCR',
      status: 'active',
      desc: 'Nameplate OCR extraction & Instrument specification intake'
    },
    {
      num: 3,
      title: 'R-76 Testing & Calculation Engine',
      status: 'pending',
      desc: 'Accuracy, Repeatability, Eccentricity, Tare & MPE calculations'
    },
    {
      num: 4,
      title: 'Report Generation + QR',
      status: 'pending',
      desc: 'Standardized OIML R-76 PDF format & cryptographic QR verification'
    },
    {
      num: 5,
      title: 'Dashboard & Repository',
      status: 'pending',
      desc: 'Laboratory records archive, audit logs & metrology registry'
    },
    {
      num: 6,
      title: 'Integration, Security & Polish',
      status: 'pending',
      desc: 'End-to-end SIH evaluation readiness, hardening & final demo'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Phase 2 Active &bull; Instrument + OCR
              </span>
              <span className="text-xs text-slate-500 font-mono">
                SIH Problem Statement 26035
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Welcome, {user?.full_name}
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              NAWI Test Report Generation System as per OIML Recommendation R-76. Instrument registry, OCR nameplate intake, and laboratory calibration records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Current Role</div>
              <div className="text-xs font-mono font-bold text-blue-700 uppercase">
                {user?.role_name || 'TECHNICIAN'}
              </div>
            </div>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Node Status</div>
              <div className="text-xs font-semibold text-emerald-600 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Operational
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">PostgreSQL Engine</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {apiHealth?.database === 'connected' ? 'Connected' : 'Local Instance'}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Database: nawi_r76</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">API Server</span>
            <Server className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {apiHealth?.status === 'healthy' ? 'Express Online' : 'Node / Express'}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Port 5000 &bull; Localhost</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Authentication</span>
            <ShieldAlert className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">JWT + Bcrypt</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Role-Based Access Control</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">OIML Standard</span>
            <FileCheck2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">R-76-1 / R-76-2</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Phase 2-4 Staging</span>
          </div>
        </div>
      </div>

      {/* 6-Phase Roadmap Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              5-Day SIH 2026 Implementation Roadmap
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly phased architecture with verified milestones.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">1 of 6 Completed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roadmapPhases.map((phase) => (
            <div
              key={phase.num}
              className={`p-4 rounded-md border text-left transition-all ${
                phase.status === 'active'
                  ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-400'
                  : 'bg-slate-50/60 border-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-slate-500">
                  PHASE 0{phase.num}
                </span>
                {phase.status === 'active' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-700 text-white uppercase tracking-wider">
                    CURRENT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                    PENDING
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                {phase.title}
              </h4>
              <p className="text-xs text-slate-600">
                {phase.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Session Info Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
          Active Operator Credentials & Boundary Verification
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">User ID (UUID)</span>
            <span className="text-slate-800 break-all">{user?.id}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Registered Email</span>
            <span className="text-slate-800">{user?.email}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Laboratory Assignment</span>
            <span className="text-slate-800">{user?.laboratory_name || 'Central Metrology Lab (Default)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
