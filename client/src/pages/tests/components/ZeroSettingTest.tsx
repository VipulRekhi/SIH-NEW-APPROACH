import React, { useState, useEffect } from 'react';
import { TestSessionService } from '../../../services/testSessionService';
import type { TestSessionTest, TestObservation } from '../../../types/test.types';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface Props {
  sessionId: string;
  test: TestSessionTest;
  unit: string;
  verificationIntervalE: number;
  onUpdated: () => void;
}

export const ZeroSettingTest: React.FC<Props> = ({ sessionId, test, unit, verificationIntervalE, onUpdated }) => {
  const [observations, setObservations] = useState<TestObservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [initialIndication, setInitialIndication] = useState<string>('0.005');
  const [finalIndication, setFinalIndication] = useState<string>('0.000');
  const [additionalLoad, setAdditionalLoad] = useState<string>('0.004');
  const [remarks, setRemarks] = useState<string>('Semi-automatic zero-setting key actuated');

  const fetchObservations = async () => {
    setLoading(true);
    try {
      const data = await TestSessionService.getObservations(sessionId, test.id);
      setObservations(data.observations);
      if (data.observations.length > 0) {
        const obs = data.observations[0];
        setInitialIndication(obs.load_value?.toString() || '0');
        setFinalIndication(obs.indication_value?.toString() || '0');
        setAdditionalLoad(obs.additional_load?.toString() || '');
        setRemarks(obs.remarks || '');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load zero-setting observations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [sessionId, test.id]);

  const handleSaveAndCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    setError(null);
    try {
      // Clear previous observations for zero test
      if (observations.length > 0) {
        for (const obs of observations) {
          await TestSessionService.deleteObservation(sessionId, test.id, obs.id);
        }
      }

      await TestSessionService.addObservation(sessionId, test.id, {
        sequenceNo: 1,
        loadValue: parseFloat(initialIndication),
        loadUnit: unit,
        indicationValue: parseFloat(finalIndication),
        indicationUnit: unit,
        additionalLoad: additionalLoad ? parseFloat(additionalLoad) : null,
        remarks
      });

      await TestSessionService.calculateTest(sessionId, test.id);
      await fetchObservations();
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Zero evaluation failed.');
    } finally {
      setCalculating(false);
    }
  };

  const summary = test.calculation_summary;
  const isPass = test.status === 'PASS';
  const isFail = test.status === 'FAIL';
  const isReview = test.status === 'REVIEW_REQUIRED';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Loading observations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {test.r76_reference}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-700">Clause 4.5 & Annex A.4.2</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Zero-Setting & Zero-Tracking Accuracy
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Verification of zero-setting accuracy. Zero error E0 must not exceed &plusmn;0.25e (&plusmn;{(0.25 * verificationIntervalE).toFixed(4)} {unit}).
          </p>
        </div>

        {isPass && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>COMPLIANT (E0 &le; 0.25e)</span>
          </span>
        )}
        {isFail && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-800 bg-red-50 rounded border border-red-200">
            <XCircle className="w-4 h-4 text-red-600" />
            <span>NON-COMPLIANT</span>
          </span>
        )}
        {isReview && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 rounded border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>REVIEW REQUIRED</span>
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Structured Zero Observation Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-5">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
          Structured Zero-Setting Observation Protocol
        </div>

        <form onSubmit={handleSaveAndCalculate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-600 font-semibold block mb-1">
                Initial Indication Before Zero-Setting ({unit}):
              </label>
              <input
                type="number"
                step="any"
                required
                value={initialIndication}
                onChange={(e) => setInitialIndication(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">
                Final Indication After Zero-Setting ({unit}):
              </label>
              <input
                type="number"
                step="any"
                required
                value={finalIndication}
                onChange={(e) => setFinalIndication(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">
                Changeover Weight at Zero (&Delta;L0, {unit}):
              </label>
              <input
                type="number"
                step="any"
                value={additionalLoad}
                onChange={(e) => setAdditionalLoad(e.target.value)}
                placeholder="Optional turning weights"
                className="w-full border border-slate-300 rounded p-2 bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-600 font-semibold block mb-1">
              Actuation Method & Technician Observation:
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Non-automatic zero button actuated; zero annunciator illuminated"
              className="w-full border border-slate-300 rounded p-2 bg-white"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between font-mono">
            <div>
              <span className="text-slate-500 font-sans text-[11px] block">Max Permissible Zero Error Limit:</span>
              <span className="font-bold text-slate-800">
                &plusmn;0.25e = &plusmn;{(0.25 * verificationIntervalE).toFixed(4)} {unit}
              </span>
            </div>
            {summary && summary.zeroErrorE0 !== undefined && (
              <div>
                <span className="text-slate-500 font-sans text-[11px] block">Calculated Zero Error (E0):</span>
                <span className="font-bold text-blue-800">
                  {summary.zeroErrorE0 > 0 ? '+' : ''}{summary.zeroErrorE0.toFixed(4)} {unit}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={calculating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{calculating ? 'Evaluating...' : 'Evaluate Zero-Setting Accuracy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
