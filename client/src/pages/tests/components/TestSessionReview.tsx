import React, { useState } from 'react';
import { TestSessionService } from '../../../services/testSessionService';
import type { TestSession, TestSessionTest } from '../../../types/test.types';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Scale,
  MinusCircle,
  Info
} from 'lucide-react';

interface Props {
  session: TestSession;
  tests: TestSessionTest[];
  onUpdated: () => void;
}

export const TestSessionReview: React.FC<Props> = ({ session, tests, onUpdated }) => {
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError(null);
    try {
      await TestSessionService.evaluateSession(session.id);
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to evaluate overall session status.');
    } finally {
      setEvaluating(false);
    }
  };

  const getSessionStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
                  Overall Test Session Status: PASSED
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  All applicable OIML R 76-1:2006 metrological tests have been executed and satisfy maximum permissible error tolerances.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-emerald-700 text-white font-mono">
              PASSED
            </span>
          </div>
        );
      case 'FAILED':
        return (
          <div className="p-4 bg-red-50 border border-red-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-red-950 uppercase tracking-wide">
                  Overall Test Session Status: FAILED
                </h4>
                <p className="text-xs text-red-800 mt-0.5">
                  One or more mandatory metrological test rules exceed the maximum permissible error (MPE) limit specified by OIML R 76-1:2006.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-red-700 text-white font-mono">
              FAILED
            </span>
          </div>
        );
      case 'REVIEW_REQUIRED':
        return (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
                  Overall Test Session Status: REVIEW REQUIRED
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Certain test criteria require technician manual inspection or qualitative verification before official certification.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-amber-700 text-white font-mono">
              REVIEW REQUIRED
            </span>
          </div>
        );
      default:
        return (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-700 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-blue-950 uppercase tracking-wide">
                  Overall Test Session Status: {session.status}
                </h4>
                <p className="text-xs text-blue-800 mt-0.5">
                  Click below to evaluate and finalize compliance across all completed tests.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={evaluating}
              onClick={handleEvaluate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{evaluating ? 'Evaluating...' : 'Evaluate Session'}</span>
            </button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Status Banner */}
      {getSessionStatusBadge(session.status)}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Traceability Overview Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Metrological Regulatory Traceability Summary
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {session.regulation_version}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Session Reference:</span>
            <span className="font-mono font-bold text-slate-800">{session.session_number}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Regulatory Mode:</span>
            <span className="font-mono font-bold text-purple-800">{session.regulatory_mode}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Accredited Laboratory:</span>
            <span className="font-semibold text-slate-800">{session.laboratory_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Assigned Technician:</span>
            <span className="font-semibold text-slate-800">{session.technician_name}</span>
          </div>
        </div>

        {/* Environmental conditions */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 font-sans block">Temperature:</span>
            <span className="text-slate-800 font-bold">{session.environmental_conditions?.temperature ?? '22.5'} °C</span>
          </div>
          <div>
            <span className="text-slate-400 font-sans block">Humidity:</span>
            <span className="text-slate-800 font-bold">{session.environmental_conditions?.humidity ?? '50.0'} %</span>
          </div>
          <div>
            <span className="text-slate-400 font-sans block">Pressure:</span>
            <span className="text-slate-800 font-bold">{session.environmental_conditions?.atmosphericPressure ?? '1013.25'} hPa</span>
          </div>
        </div>
      </div>

      {/* Rule-By-Rule Decision Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-800 uppercase tracking-wide block">
              Rule-By-Rule Decision & Compliance Audit Trail
            </span>
            <span className="text-[11px] text-slate-500">
              Deterministic answers to: "Why did each individual test PASS, FAIL, or require REVIEW?"
            </span>
          </div>
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={evaluating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Re-evaluate Overall Compliance</span>
          </button>
        </div>

        <div className="divide-y divide-slate-200">
          {tests.map((t) => {
            const isPass = t.status === 'PASS';
            const isFail = t.status === 'FAIL';
            const isReview = t.status === 'REVIEW_REQUIRED';
            const isNotApplicable = t.status === 'NOT_APPLICABLE' || t.applicability_status === 'NOT_APPLICABLE';
            const isDraft = t.status === 'DRAFT' || t.status === 'IN_PROGRESS' || t.status === 'INCOMPLETE';

            return (
              <div key={t.id} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {t.code}
                    </span>
                    <span className="font-bold text-xs text-slate-900">{t.name}</span>
                    <span className="text-slate-400 text-xs">&bull;</span>
                    <span className="text-xs text-slate-500 font-mono">{t.r76_reference}</span>
                  </div>

                  <div>
                    {isPass && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        PASS
                      </span>
                    )}
                    {isFail && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-red-800 bg-red-50 border border-red-200">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        FAIL
                      </span>
                    )}
                    {isReview && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        REVIEW REQUIRED
                      </span>
                    )}
                    {isNotApplicable && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-300 font-mono">
                        <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
                        NOT APPLICABLE
                      </span>
                    )}
                    {isDraft && !isNotApplicable && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-300">
                        {t.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 State Indicators Bar */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Impl: <strong>{t.implementation_state}</strong>
                  </span>
                  <span className={`px-2 py-0.5 rounded border ${
                    t.applicability_status === 'NOT_APPLICABLE' || isNotApplicable
                      ? 'bg-slate-100 text-slate-600 border-slate-300'
                      : t.applicability_status === 'REVIEW_REQUIRED'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    Applicability: <strong>{t.applicability_status || (isNotApplicable ? 'NOT_APPLICABLE' : 'APPLICABLE')}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Execution: <strong>{t.execution_status || (isNotApplicable ? 'COMPLETED' : (isPass || isFail ? 'COMPLETED' : 'NOT_STARTED'))}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Result: <strong>{t.status}</strong>
                  </span>
                </div>

                {/* Applicability Reason (if NOT_APPLICABLE or REVIEW_REQUIRED) */}
                {t.applicability_reason && (isNotApplicable || isReview) && (
                  <div className="flex items-start gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
                    <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                    <span>{t.applicability_reason}</span>
                  </div>
                )}

                {/* Calculation Details */}
                {t.calculation_summary ? (
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(t.calculation_summary, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    No calculations run yet for this test module.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
