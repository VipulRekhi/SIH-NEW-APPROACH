import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  ShieldCheck,
  CheckSquare,
  Clock,
  History,
  FileSpreadsheet
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItemClass = (toPath: string, searchMatch?: string) => {
    const isCurrent = searchMatch
      ? location.pathname + location.search === toPath
      : location.pathname === toPath && !location.search;

    return `flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
      isCurrent
        ? 'bg-slate-800 text-white shadow-xs'
        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
    }`;
  };

  const role = user?.role_name || 'technician';

  const roleBadgeStyle = {
    admin: 'bg-purple-900/70 text-purple-200 border-purple-600',
    officer: 'bg-amber-900/70 text-amber-200 border-amber-600',
    technician: 'bg-cyan-900/70 text-cyan-200 border-cyan-600'
  }[role];

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
            <div className="font-semibold text-[10px] tracking-wider text-slate-400 uppercase">
              Legal Metrology
            </div>
            <div className="font-bold text-sm tracking-tight text-white leading-tight">
              NAWI R-76 System
            </div>
          </div>
        </div>

        {/* User Persona Quick Display in Sidebar */}
        <div className="px-4 py-3 bg-[#081220]/70 border-b border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mb-1">
            Active Persona
          </div>
          <div className="text-xs font-bold text-white truncate">
            {user?.full_name || 'Authorized Metrologist'}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${roleBadgeStyle}`}>
              {role.toUpperCase()}
            </span>
            {user?.laboratory_name && (
              <span className="text-[10px] text-slate-400 truncate" title={user.laboratory_name}>
                &bull; {user.laboratory_name}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Role Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* 1. TECHNICIAN NAVIGATION */}
          {role === 'technician' && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Technician Workflow
              </div>
              <nav className="space-y-1">
                <NavLink to="/app/dashboard" className={() => navItemClass('/app/dashboard')}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink to="/app/instruments" className={() => navItemClass('/app/instruments')}>
                  <Scale className="w-4 h-4" />
                  <span>Instruments</span>
                </NavLink>

                <NavLink to="/app/tests?tab=my_tests" className={() => navItemClass('/app/tests?tab=my_tests', 'my_tests')}>
                  <FlaskConical className="w-4 h-4" />
                  <span>My Tests</span>
                </NavLink>

                <NavLink to="/app/tests?tab=pending_review" className={() => navItemClass('/app/tests?tab=pending_review', 'pending_review')}>
                  <Clock className="w-4 h-4" />
                  <span>Pending Review</span>
                </NavLink>

                <NavLink to="/app/reports" className={() => navItemClass('/app/reports')}>
                  <History className="w-4 h-4" />
                  <span>History</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* 2. OFFICER NAVIGATION */}
          {role === 'officer' && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Officer Approval Workflow
              </div>
              <nav className="space-y-1">
                <NavLink to="/app/dashboard" className={() => navItemClass('/app/dashboard')}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink to="/app/tests?tab=review_queue" className={() => navItemClass('/app/tests?tab=review_queue', 'review_queue')}>
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>Review Queue</span>
                </NavLink>

                <NavLink to="/app/tests" className={() => navItemClass('/app/tests')}>
                  <FlaskConical className="w-4 h-4" />
                  <span>Tests</span>
                </NavLink>

                <NavLink to="/app/reports" className={() => navItemClass('/app/reports')}>
                  <FileText className="w-4 h-4" />
                  <span>Reports</span>
                </NavLink>

                <NavLink to="/app/instruments" className={() => navItemClass('/app/instruments')}>
                  <Scale className="w-4 h-4" />
                  <span>Instruments</span>
                </NavLink>

                <NavLink to="/app/reports?tab=history" className={() => navItemClass('/app/reports?tab=history', 'history')}>
                  <History className="w-4 h-4" />
                  <span>History</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* 3. ADMIN NAVIGATION */}
          {role === 'admin' && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                System Administration
              </div>
              <nav className="space-y-1">
                <NavLink to="/app/dashboard" className={() => navItemClass('/app/dashboard')}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink to="/app/users" className={() => navItemClass('/app/users')}>
                  <Users className="w-4 h-4" />
                  <span>Users</span>
                </NavLink>

                <NavLink to="/app/laboratories" className={() => navItemClass('/app/laboratories')}>
                  <Building2 className="w-4 h-4" />
                  <span>Laboratories</span>
                </NavLink>

                <NavLink to="/app/instruments" className={() => navItemClass('/app/instruments')}>
                  <Scale className="w-4 h-4" />
                  <span>Instruments</span>
                </NavLink>

                <NavLink to="/app/tests" className={() => navItemClass('/app/tests')}>
                  <FlaskConical className="w-4 h-4" />
                  <span>Tests</span>
                </NavLink>

                <NavLink to="/app/reports" className={() => navItemClass('/app/reports')}>
                  <FileText className="w-4 h-4" />
                  <span>Reports</span>
                </NavLink>

                <NavLink to="/app/audit-logs" className={() => navItemClass('/app/audit-logs')}>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Audit Logs</span>
                </NavLink>

                <NavLink to="/app/settings" className={() => navItemClass('/app/settings')}>
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </NavLink>
              </nav>
            </div>
          )}
        </div>

        {/* Institutional Branding */}
        <div className="p-3 border-t border-slate-800 bg-[#081220]/60">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-0.5">
            <span>NAWI R-76 System</span>
            <span className="font-mono text-[10px] text-slate-400 font-normal">OIML Standard</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Legal Metrology Verification
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
              <div className="text-sm font-bold text-slate-900 leading-tight">
                {user?.full_name || 'Authorized Metrologist'}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${roleBadgeStyle}`}>
                  {role.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <button
              id="logout-button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-300 rounded transition-colors"
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
