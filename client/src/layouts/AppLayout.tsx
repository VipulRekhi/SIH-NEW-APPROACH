import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Scale,
  FlaskConical,
  FileText,
  Users,
  Building2,
  Settings,
  LogOut,
  ShieldCheck
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? 'bg-slate-800 text-white shadow-sm'
        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
    }`;

  const roleBadgeColor = {
    admin: 'bg-purple-900/60 text-purple-200 border-purple-700',
    officer: 'bg-amber-900/60 text-amber-200 border-amber-700',
    technician: 'bg-cyan-900/60 text-cyan-200 border-cyan-700'
  }[user?.role_name || 'technician'];

  return (
    <div className="flex h-screen bg-slate-100 font-sans antialiased text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0B192C] text-slate-200 flex flex-col flex-shrink-0 border-r border-slate-800">
        {/* Brand / Emblem */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-inner">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-xs tracking-wider text-slate-400 uppercase">
              Legal Metrology
            </div>
            <div className="font-bold text-sm tracking-tight text-white leading-tight">
              NAWI R-76 System
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Main Operational Modules */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Operations
            </div>
            <nav className="space-y-1">
              <NavLink to="/app/dashboard" className={navItemClass}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/app/instruments" className={navItemClass}>
                <Scale className="w-4 h-4" />
                <span>Instruments</span>
              </NavLink>

              <NavLink to="/app/tests" className={navItemClass}>
                <FlaskConical className="w-4 h-4" />
                <span>Tests</span>
              </NavLink>

              <NavLink to="/app/reports" className={navItemClass}>
                <FileText className="w-4 h-4" />
                <span>Reports</span>
              </NavLink>
            </nav>
          </div>

          {/* Administration Section */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Administration
            </div>
            <nav className="space-y-1">
              <NavLink to="/app/users" className={navItemClass}>
                <Users className="w-4 h-4" />
                <span>Users</span>
              </NavLink>

              <NavLink to="/app/laboratories" className={navItemClass}>
                <Building2 className="w-4 h-4" />
                <span>Laboratories</span>
              </NavLink>
            </nav>
          </div>

          {/* System Settings */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              System
            </div>
            <nav className="space-y-1">
              <NavLink to="/app/settings" className={navItemClass}>
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* System Status / Phase Indicator */}
        <div className="p-3 border-t border-slate-800 bg-[#081220]/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Local Node Active
            </span>
            <span className="font-mono text-[11px] text-emerald-400 font-semibold">Phase 3 Active</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            OIML R 76-1:2006 Engine
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <h1 className="text-sm font-semibold text-slate-900 tracking-wide uppercase">
              NAWI Test Report Generation System (OIML R-76)
            </h1>
          </div>

          {/* Top-Right User Status & Actions */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900 leading-tight">
                {user?.full_name || 'Authorized User'}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${roleBadgeColor}`}>
                  {user?.role_name || 'TECHNICIAN'}
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <button
              id="logout-button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-300 rounded transition-colors"
              title="End current laboratory session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
