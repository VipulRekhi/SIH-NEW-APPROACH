import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, UserCheck, ShieldAlert, Award, Wrench } from 'lucide-react';

interface DemoPersona {
  name: string;
  role: 'TECHNICIAN' | 'OFFICER' | 'ADMIN';
  email: string;
  pass: string;
  responsibility: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  buttonClass: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    name: 'Pramod Patil',
    role: 'TECHNICIAN',
    email: 'pramod.patil@nawi.gov.in',
    pass: 'Password@123',
    responsibility: 'Performs physical instrument testing, records raw observations, and submits test sessions for review.',
    icon: Wrench,
    badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    buttonClass: 'bg-cyan-700 hover:bg-cyan-800 text-white'
  },
  {
    name: 'Anand Deshpande',
    role: 'OFFICER',
    email: 'anand.deshpande@nawi.gov.in',
    pass: 'Password@123',
    responsibility: 'Reviews technical observations, verifies R-76 compliance, approves tests, and issues official certificates.',
    icon: Award,
    badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
    buttonClass: 'bg-amber-700 hover:bg-amber-800 text-white'
  },
  {
    name: 'Rakesh Sharma',
    role: 'ADMIN',
    email: 'rakesh.sharma@nawi.gov.in',
    pass: 'Admin@123456',
    responsibility: 'Manages users, laboratories, configuration and system administration. Metrological approval reserved for Officer.',
    icon: ShieldAlert,
    badgeColor: 'bg-purple-50 text-purple-900 border-purple-300',
    buttonClass: 'bg-purple-700 hover:bg-purple-800 text-white'
  }
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoLoggingIn, setDemoLoggingIn] = useState<string | null>(null);
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    const success = await login(email, password);
    setIsSubmitting(false);

    if (success) {
      navigate('/app/dashboard');
    }
  };

  const handleDemoLogin = async (persona: DemoPersona) => {
    clearError();
    setDemoLoggingIn(persona.name);
    setEmail(persona.email);
    setPassword(persona.pass);

    const success = await login(persona.email, persona.pass);
    setDemoLoggingIn(null);

    if (success) {
      navigate('/app/dashboard');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Institutional Metrology Access</h3>
        <p className="text-xs text-slate-500 mt-1">
          OIML R 76-1:2006 legal metrology workflow. Authenticate with institutional credentials or select a demo persona.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2.5 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION: THREE DEMO PERSONAS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-700" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Demo User Profiles (Select Institutional Role)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DEMO_PERSONAS.map((persona) => {
            const Icon = persona.icon;
            const isLogging = demoLoggingIn === persona.name;
            return (
              <div
                key={persona.name}
                className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all text-left"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${persona.badgeColor}`}>
                      {persona.role}
                    </span>
                  </div>

                  <div>
                    <h5 className="text-sm font-bold text-slate-900 leading-tight">
                      {persona.name}
                    </h5>
                    <div className="text-[11px] font-mono text-slate-500 truncate" title={persona.email}>
                      {persona.email}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-3 leading-snug">
                    {persona.responsibility}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={isSubmitting || !!demoLoggingIn}
                    onClick={() => handleDemoLogin(persona)}
                    className={`w-full py-1.5 px-3 rounded text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors shadow-xs ${persona.buttonClass} disabled:opacity-50`}
                  >
                    {isLogging ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Logging in...
                      </span>
                    ) : (
                      <>
                        <span>Demo Login</span>
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DIVIDER */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider text-[10px]">
            Or Sign In Manually
          </span>
        </div>
      </div>

      {/* MANUAL CREDENTIAL FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@laboratory.gov.in"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-slate-700">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
            />
          </div>
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={isSubmitting || !!demoLoggingIn}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded text-xs font-semibold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 transition-colors shadow-xs"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Authenticating...
            </span>
          ) : (
            <>
              <span>Sign In with Credentials</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-600">
          Need a technician account?{' '}
          <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-800">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};
