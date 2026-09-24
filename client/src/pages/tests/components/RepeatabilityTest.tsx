import React, { useState, useEffect } from 'react';
import { TestSessionService } from '../../../services/testSessionService';
import type { TestSessionTest, TestObservation } from '../../../types/test.types';
import {
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface Props {
  sessionId: string;
  test: TestSessionTest;
  unit: string;
  maxCapacity: number;
  onUpdated: () => void;
}

export const RepeatabilityTest: React.FC<Props> = ({ sessionId, test, unit, maxCapacity, onUpdated }) => {
  const [observations, setObservations] = useState<TestObservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [testLoad, setTestLoad] = useState<string>((maxCapacity * 0.5).toString());
  const [readingValue, setReadingValue] = useState<string>('');

  const fetchObservations = async () => {
    setLoading(true);
    try {
      const data = await TestSessionService.getObservations(sessionId, test.id);
      setObservations(data.observations);
      if (data.observations.length > 0) {
        setTestLoad(data.observations[0].load_value.toString());
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load repeatability readings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [sessionId, test.id]);

  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingValue || !testLoad) return;

    try {
      await TestSessionService.addObservation(sessionId, test.id, {
        sequenceNo: observations.length + 1,
        loadValue: parseFloat(testLoad),
        loadUnit: unit,
        indicationValue: parseFloat(readingValue),
        indicationUnit: unit,
        repeatNumber: observations.length + 1
      });

      setReadingValue('');
      await fetchObservations();
      onUpdated();
    } catch (err: any) {
      alert('Failed to add repeatability reading.');
    }
  };

  const handleDeleteReading = async (obsId: string) => {
    try {
      await TestSessionService.deleteObservation(sessionId, test.id, obsId);
      await fetchObservations();
      onUpdated();
    } catch (err: any) {
      alert('Failed to delete reading.');
    }
  };

  const handleRunCalculation = async () => {
    setCalculating(true);
    setError(null);
    try {
      await TestSessionService.calculateTest(sessionId, test.id);
      await fetchObservations();
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Calculation failed.');
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
            <span className="text-xs font-semibold text-slate-700">Clause 3.6.1 & Annex A.4.10</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Repeatability Test
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Type evaluation requires 10 weighings for instruments with Max &lt; 1000 kg (Series 1: ~50% Max [{maxCapacity * 0.5} {unit}], Series 2: ~100% Max [{maxCapacity} {unit}]).
            Compliance: &Delta;I = I_max - I_min &le; |MPE(load)|.
          </p>
        </div>

        <button
          type="button"
          disabled={observations.length === 0 || calculating}
          onClick={handleRunCalculation}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded shadow-xs transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{calculating ? 'Calculating...' : 'Run Calculation'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Derived Calculation Results Card - Only show when actual observations exist */}
      {summary && observations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-800">
                Derived Repeatability Metrics
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Test Load: {summary.load} {unit}
              </span>
            </div>
            {isPass && (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                PASS (Clause 3.6.1 Compliant)
              </span>
            )}
            {isFail && (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-red-700 bg-red-50 rounded border border-red-200">
                <XCircle className="w-4 h-4" />
                FAIL (Exceeds MPE)
              </span>
            )}
            {isReview && (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-amber-800 bg-amber-50 rounded border border-amber-200">
                <AlertTriangle className="w-4 h-4" />
                REVIEW REQUIRED ({observations.length} / {summary.requiredCount || 10} readings)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Maximum Indication</span>
              <span className="font-bold text-slate-900 text-sm">{summary.maxIndication} {unit}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Minimum Indication</span>
              <span className="font-bold text-slate-900 text-sm">{summary.minIndication} {unit}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Difference (&Delta;I)</span>
              <span className="font-bold text-blue-800 text-sm">{summary.rangeDifference?.toFixed(4)} {unit}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Applicable MPE Limit</span>
              <span className="font-bold text-slate-900 text-sm">+/-{summary.mpeAbsolute} {unit}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Readings Count</span>
              <span className="font-bold text-slate-900 text-sm">{observations.length} / {summary.requiredCount || 10}</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Reading Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-blue-700" />
          <span>Record Repeat Observation Reading</span>
        </div>

        <form onSubmit={handleAddReading} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-slate-500 block mb-1">Constant Test Load ({unit}):</label>
            <input
              type="number"
              step="any"
              required
              value={testLoad}
              onChange={(e) => setTestLoad(e.target.value)}
              placeholder="e.g. 15"
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-500 block mb-1">
              Reading #{observations.length + 1} Indication ({unit}):
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              placeholder="e.g. 15.000"
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Reading #{observations.length + 1}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Readings Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wide">
            Observation Series ({observations.length} of 10 readings)
          </span>
          <span className="text-[11px] text-slate-500">
            OIML A.4.10 mandate: 10 readings for Type Evaluation
          </span>
        </div>

        <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase font-sans">
            <tr>
              <th className="px-3 py-2.5">Reading No.</th>
              <th className="px-3 py-2.5">Test Load</th>
              <th className="px-3 py-2.5">Indicated Value (I)</th>
              <th className="px-3 py-2.5">Timestamp</th>
              <th className="px-3 py-2.5 text-right font-sans">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {observations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-sans">
                  No repeated readings recorded yet.
                </td>
              </tr>
            ) : (
              observations.map((obs) => (
                <tr key={obs.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-600 font-sans font-bold">Reading #{obs.sequence_no}</td>
                  <td className="px-3 py-2">{obs.load_value} {obs.load_unit}</td>
                  <td className="px-3 py-2 font-bold text-blue-900">{obs.indication_value} {obs.indication_unit}</td>
                  <td className="px-3 py-2 text-slate-400 text-[11px] font-sans">
                    {new Date(obs.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2 text-right font-sans">
                    <button
                      type="button"
                      onClick={() => handleDeleteReading(obs.id)}
                      className="p-1 text-slate-400 hover:text-red-700 transition-colors"
                      title="Delete reading"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
