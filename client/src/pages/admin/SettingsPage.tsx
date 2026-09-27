import React from 'react';
import {
  Scale,
  ShieldCheck,
  Cpu,
  Database,
  CheckCircle2
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 uppercase tracking-wide">
              Configuration
            </span>
            <span className="text-xs text-slate-500 font-mono">
              OIML Recommendation R-76
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            System Parameters & Metrological Standards Configuration
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Deterministic MPE thresholds, regulatory clauses, and calculation engine configuration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Deterministic Engine Active</span>
          </span>
        </div>
      </div>

      {/* Standards Parameters Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              OIML R 76-1:2006 Maximum Permissible Error (MPE) Matrices
            </h3>
            <p className="text-xs text-slate-500">
              Clause 3.5.1 MPE thresholds for Non-Automatic Weighing Instruments (NAWI) upon initial verification.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Accuracy Class</th>
                <th className="py-2.5 px-3">Initial MPE: &plusmn;0.5 e</th>
                <th className="py-2.5 px-3">Initial MPE: &plusmn;1.0 e</th>
                <th className="py-2.5 px-3">Initial MPE: &plusmn;1.5 e</th>
                <th className="py-2.5 px-3">Service Inspection (2x MPE)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-bold text-blue-900 font-sans">Class I (Special)</td>
                <td className="py-2.5 px-3">0 &le; m &le; 50 000 e</td>
                <td className="py-2.5 px-3">50 000 e &lt; m &le; 200 000 e</td>
                <td className="py-2.5 px-3">m &gt; 200 000 e</td>
                <td className="py-2.5 px-3 text-slate-500 font-sans">Active (2 &times; Initial MPE)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-blue-900 font-sans">Class II (High)</td>
                <td className="py-2.5 px-3">0 &le; m &le; 5 000 e</td>
                <td className="py-2.5 px-3">5 000 e &lt; m &le; 20 000 e</td>
                <td className="py-2.5 px-3">20 000 e &lt; m &le; 100 000 e</td>
                <td className="py-2.5 px-3 text-slate-500 font-sans">Active (2 &times; Initial MPE)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-blue-900 font-sans">Class III (Medium)</td>
                <td className="py-2.5 px-3">0 &le; m &le; 500 e</td>
                <td className="py-2.5 px-3">500 e &lt; m &le; 2 000 e</td>
                <td className="py-2.5 px-3">2 000 e &lt; m &le; 10 000 e</td>
                <td className="py-2.5 px-3 text-slate-500 font-sans">Active (2 &times; Initial MPE)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-blue-900 font-sans">Class IIII (Ordinary)</td>
                <td className="py-2.5 px-3">0 &le; m &le; 50 e</td>
                <td className="py-2.5 px-3">50 e &lt; m &le; 200 e</td>
                <td className="py-2.5 px-3">200 e &lt; m &le; 1 000 e</td>
                <td className="py-2.5 px-3 text-slate-500 font-sans">Active (2 &times; Initial MPE)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* System Node Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Cpu className="w-4 h-4 text-purple-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Calculation Precision</h4>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Arithmetic Precision:</span>
              <span className="font-mono font-bold text-slate-900">Arbitrary Precision (decimal.js)</span>
            </div>
            <div className="flex justify-between">
              <span>Turning Point Formula:</span>
              <span className="font-mono font-bold text-slate-900">E = I + 0.5d - &Delta;L - L</span>
            </div>
            <div className="flex justify-between">
              <span>Corrected Error:</span>
              <span className="font-mono font-bold text-slate-900">Ec = E - E0</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Database className="w-4 h-4 text-blue-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Storage & Database</h4>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Database Engine:</span>
              <span className="font-mono font-bold text-slate-900">PostgreSQL 14+</span>
            </div>
            <div className="flex justify-between">
              <span>Isolation Level:</span>
              <span className="font-mono font-bold text-slate-900">READ COMMITTED</span>
            </div>
            <div className="flex justify-between">
              <span>Audit Logging:</span>
              <span className="font-mono font-bold text-emerald-700">ENABLED (Immutable)</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Security & Authentication</h4>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Token Type:</span>
              <span className="font-mono font-bold text-slate-900">JWT (RS256 / HS256)</span>
            </div>
            <div className="flex justify-between">
              <span>Password Hashing:</span>
              <span className="font-mono font-bold text-slate-900">bcrypt (12 rounds)</span>
            </div>
            <div className="flex justify-between">
              <span>Role Enforcer:</span>
              <span className="font-mono font-bold text-emerald-700">Active (Backend Boundary)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
