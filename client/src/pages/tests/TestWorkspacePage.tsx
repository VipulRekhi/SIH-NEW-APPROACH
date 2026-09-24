import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TestSessionService } from '../../services/testSessionService';
import type { TestSession, TestSessionTest } from '../../types/test.types';
import { WeighingPerformanceTest } from './components/WeighingPerformanceTest';
import { RepeatabilityTest } from './components/RepeatabilityTest';
import { EccentricLoadingTest } from './components/EccentricLoadingTest';
import { ZeroSettingTest } from './components/ZeroSettingTest';
import { DiscriminationTest } from './components/DiscriminationTest';
import { TestSessionReview } from './components/TestSessionReview';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  MinusCircle,
  Info
} from 'lucide-react';

export const TestWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<TestSession | null>(null);
  const [tests, setTests] = useState<TestSessionTest[]>([]);
  const [activeTab, setActiveTab] = useState<string>('WEIGHING_PERFORMANCE');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionDetails = useCallback(async () => {
    if (!id) return;
    try {
      const data = await TestSessionService.getSession(id);
      setSession(data.session);
      setTests(data.tests);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load test session workspace.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSessionDetails();
  }, [fetchSessionDetails]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-blue-700 rounded-full animate-spin" />
        <span className="text-xs font-medium text-slate-600">Loading laboratory testing workspace...</span>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white border border-red-200 rounded-lg shadow-xs text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900">Session Unavailable</h3>
        <p className="text-xs text-slate-600">{error || 'Session could not be located.'}</p>
        <Link
          to="/app/tests"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Test Sessions</span>
        </Link>
      </div>
    );
  }

  const getTestStatusIcon = (status: string, applicabilityStatus?: string) => {
    if (status === 'NOT_APPLICABLE' || applicabilityStatus === 'NOT_APPLICABLE') {
      return <MinusCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
    }
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />;
      case 'FAIL':
        return <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />;
      case 'REVIEW_REQUIRED':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />;
    }
  };

  const currentActiveTest = tests.find(t => t.code === activeTab);

  return (
    <div className="space-y-5">
      {/* Workspace Header Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/app/tests"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-800">
                {session.session_number}
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                {session.regulatory_mode}
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-xs text-slate-500 font-mono">
                {session.regulation_version}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              NAWI Test Session — {session.manufacturer} {session.model_number} (SN: {session.serial_number})
            </h2>
          </div>
        </div>

        {/* Technical Specs Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-slate-700">
            Class <strong className="text-blue-800">{session.accuracy_class}</strong>
          </div>
          <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-slate-700">
            Max: <strong className="text-slate-900">{session.max_capacity} {session.unit}</strong>
          </div>
          <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-slate-700">
            e = <strong className="text-slate-900">{session.verification_scale_interval} {session.unit}</strong>
          </div>
          <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-slate-700">
            d = <strong className="text-slate-900">{session.scale_interval} {session.unit}</strong>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Sidebar + Center Test Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Left Test Navigation */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-1 self-start">
          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Test Workflow Matrix
          </div>

          {tests.map((t) => {
            const isActive = activeTab === t.code;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.code)}
                className={`w-full text-left px-3 py-2 rounded text-xs font-medium flex items-center justify-between transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-xs font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {getTestStatusIcon(t.status, t.applicability_status)}
                  <span className="truncate">{t.name}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {t.status === 'NOT_APPLICABLE' && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isActive ? 'bg-blue-800 text-blue-200' : 'bg-slate-100 text-slate-500'}`}>
                      N/A
                    </span>
                  )}
                  {t.status === 'PASS' && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'}`}>
                      PASS
                    </span>
                  )}
                  {t.status === 'FAIL' && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isActive ? 'bg-red-800 text-red-100' : 'bg-red-100 text-red-800'}`}>
                      FAIL
                    </span>
                  )}
                  {t.status === 'REVIEW_REQUIRED' && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isActive ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-800'}`}>
                      REVIEW
                    </span>
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                </div>
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('REVIEW')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-medium flex items-center justify-between transition-colors ${
                activeTab === 'REVIEW'
                  ? 'bg-blue-700 text-white shadow-xs font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold">Final Review & Compliance</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* Center / Right Active Test Panel */}
        <div className="md:col-span-3">
          {activeTab === 'WEIGHING_PERFORMANCE' && currentActiveTest && (
            <WeighingPerformanceTest
              sessionId={session.id}
              test={currentActiveTest}
              unit={session.unit || 'kg'}
              onUpdated={fetchSessionDetails}
            />
          )}

          {activeTab === 'REPEATABILITY' && currentActiveTest && (
            <RepeatabilityTest
              sessionId={session.id}
              test={currentActiveTest}
              unit={session.unit || 'kg'}
              maxCapacity={session.max_capacity || 30}
              onUpdated={fetchSessionDetails}
            />
          )}

          {activeTab === 'ECCENTRIC_LOADING' && currentActiveTest && (
            <EccentricLoadingTest
              sessionId={session.id}
              test={currentActiveTest}
              unit={session.unit || 'kg'}
              maxCapacity={session.max_capacity || 30}
              onUpdated={fetchSessionDetails}
            />
          )}

          {activeTab === 'ZERO_SETTING' && currentActiveTest && (
            <ZeroSettingTest
              sessionId={session.id}
              test={currentActiveTest}
              unit={session.unit || 'kg'}
              verificationIntervalE={session.verification_scale_interval || 0.01}
              onUpdated={fetchSessionDetails}
            />
          )}

          {activeTab === 'DISCRIMINATION' && currentActiveTest && (
            <DiscriminationTest
              sessionId={session.id}
              test={currentActiveTest}
              unit={session.unit || 'kg'}
              scaleIntervalD={session.scale_interval || 0.005}
              maxCapacity={session.max_capacity || 30}
              onUpdated={fetchSessionDetails}
            />
          )}

          {activeTab === 'REVIEW' && (
            <TestSessionReview
              session={session}
              tests={tests}
              onUpdated={fetchSessionDetails}
            />
          )}

          {/* Card for NOT_APPLICABLE tests */}
          {activeTab !== 'REVIEW' &&
            currentActiveTest &&
            (currentActiveTest.status === 'NOT_APPLICABLE' || currentActiveTest.applicability_status === 'NOT_APPLICABLE') && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-5">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-md">
                      <MinusCircle className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {currentActiveTest.name}
                      </h3>
                      <span className="text-xs text-slate-500 font-mono">
                        {currentActiveTest.r76_reference}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                    NOT APPLICABLE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Module State</span>
                    <span className="font-semibold text-slate-800">{currentActiveTest.implementation_state}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Applicability</span>
                    <span className="font-semibold text-slate-800">NOT APPLICABLE</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Execution</span>
                    <span className="font-semibold text-slate-800">{currentActiveTest.execution_status || 'COMPLETED'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Test Result</span>
                    <span className="font-bold text-slate-600">NOT APPLICABLE</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Info className="w-4 h-4 text-slate-500" />
                    <span>Regulatory Applicability Determination Rationale</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-mono text-[11px]">
                    {currentActiveTest.applicability_reason || 'This test requirement is not applicable to the verified instrument configuration.'}
                  </p>
                </div>

                <div className="text-xs text-slate-500 bg-slate-50/50 p-3 rounded border border-slate-100 leading-relaxed">
                  <strong>OIML R 76-1:2006 Metrological Note:</strong> Under the regulatory standard, tests that are determined not applicable to an instrument's physical configuration (e.g., absence of secondary/remote indicating devices, printers, or equilibrium-extending slide poises) do not require test observation entry and do not impede official verification or certification.
                </div>
              </div>
            )}

          {/* Fallback for other configured tests (e.g. genuine REVIEW_REQUIRED tests) */}
          {activeTab !== 'REVIEW' &&
            activeTab !== 'WEIGHING_PERFORMANCE' &&
            activeTab !== 'REPEATABILITY' &&
            activeTab !== 'ECCENTRIC_LOADING' &&
            activeTab !== 'ZERO_SETTING' &&
            activeTab !== 'DISCRIMINATION' &&
            currentActiveTest &&
            currentActiveTest.status !== 'NOT_APPLICABLE' &&
            currentActiveTest.applicability_status !== 'NOT_APPLICABLE' && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase">
                    {currentActiveTest?.name}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Module State</span>
                    <span className="font-semibold text-slate-800">{currentActiveTest.implementation_state}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Applicability</span>
                    <span className="font-semibold text-amber-800">{currentActiveTest.applicability_status || 'APPLICABLE'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Execution</span>
                    <span className="font-semibold text-slate-800">{currentActiveTest.execution_status || 'NOT_STARTED'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Test Result</span>
                    <span className="font-bold text-amber-700">{currentActiveTest.status}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  {currentActiveTest?.description}
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  {currentActiveTest?.applicability_reason || 'This test requires technician qualitative review and manual inspection in accordance with Phase 3 regulatory policy.'}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
