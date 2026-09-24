import React from 'react';
import { Outlet } from 'react-router-dom';
import { Scale } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-radial from-slate-800 to-slate-950 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-blue-700 shadow-md border border-blue-500/30 mb-3 text-white">
          <Scale className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">
          NAWI Test Report Generation System
        </h2>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          OIML Recommendation R-76 &bull; SIH 2026 PS-26035
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-lg border border-slate-200 sm:px-10">
          <Outlet />
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Government of India &bull; Ministry of Consumer Affairs</p>
          <p className="mt-0.5">Department of Legal Metrology &bull; Local Secure Node</p>
        </div>
      </div>
    </div>
  );
};
