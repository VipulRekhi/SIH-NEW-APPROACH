import React, { useState, useEffect } from 'react';
import { TestSessionService } from '../../../services/testSessionService';
import type { TestSessionTest, TestObservation, TestResult } from '../../../types/test.types';
import {
  Plus,
  Play,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface Props {
  sessionId: string;
  test: TestSessionTest;
  unit: string;
  onUpdated: () => void;
}

export const WeighingPerformanceTest: React.FC<Props> = ({ sessionId, test, unit, onUpdated }) => {
  const [observations, setObservations] = useState<TestObservation[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New Observation Input Form
  const [direction, setDirection] = useState<'LOADING' | 'UNLOADING'>('LOADING');
  const [loadValue, setLoadValue] = useState<string>('');
  const [indicationValue, setIndicationValue] = useState<string>('');
  const [additionalLoad, setAdditionalLoad] = useState<string>('');
  const [zeroError, setZeroError] = useState<string>('0');
  const [remarks, setRemarks] = useState<string>('');

  const fetchObservations = async () => {
    setLoading(true);
    try {
      const data = await TestSessionService.getObservations(sessionId, test.id);
      setObservations(data.observations);
      setResults(data.results);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load observations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [sessionId, test.id]);

  const handleGeneratePlan = async () => {
    try {
      const plan = await TestSessionService.generatePlan(sessionId);
      if (plan.length > 0) {
        // Pre-fill the loadValue with the first recommended point
        setLoadValue(plan[0].loadValue.toString());
        setDirection(plan[0].direction);
      }
      alert(`Generated ${plan.length} recommended test points based on Min, Max, e, and Table 6 MPE transition points. You can select and edit any points.`);
    } catch (err: any) {
      alert('Failed to generate load plan.');
    }
  };

  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadValue || !indicationValue) return;

    try {
      await TestSessionService.addObservation(sessionId, test.id, {
        sequenceNo: observations.length + 1,
        direction,
        loadValue: parseFloat(loadValue),
        loadUnit: unit,
        indicationValue: parseFloat(indicationValue),
        indicationUnit: unit,
        additionalLoad: additionalLoad ? parseFloat(additionalLoad) : null,
        zeroError: zeroError ? parseFloat(zeroError) : null,
        remarks: remarks || null
      });

      // Clear entry form
      setLoadValue('');
      setIndicationValue('');
      setAdditionalLoad('');
      setRemarks('');
      await fetchObservations();
      onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to add observation.');
    }
  };

  const handleDeleteObservation = async (obsId: string) => {
    if (!confirm('Delete this observation reading?')) return;
    try {
      await TestSessionService.deleteObservation(sessionId, test.id, obsId);
      await fetchObservations();
      onUpdated();
    } catch (err: any) {
      alert('Failed to delete observation.');
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
      {/* Test Title & Reference Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {test.r76_reference}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-700">Clause 3.5.1 & Annex A.4.4.3</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Weighing Performance & Error of Indication
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Progressive loading and unloading. Errors calculated via changeover-point method: P = I + 0.5e - &Delta;L, Ec = E - E0.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGeneratePlan}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded shadow-xs transition-colors"
            title="Derive recommended test points from Min, Max, e, and MPE transition points"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Recommended Plan</span>
          </button>

          <button
            type="button"
            disabled={observations.length === 0 || calculating}
            onClick={handleRunCalculation}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{calculating ? 'Calculating...' : 'Run Calculation'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Observation Entry Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-blue-700" />
          <span>Add Physical Observation (Technician Entry)</span>
        </div>

        <form onSubmit={handleAddObservation} className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="text-slate-500 block mb-1">Direction:</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-medium"
            >
              <option value="LOADING">Loading (Increasing)</option>
              <option value="UNLOADING">Unloading (Decreasing)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Test Load (L, {unit}):</label>
            <input
              type="number"
              step="any"
              required
              value={loadValue}
              onChange={(e) => setLoadValue(e.target.value)}
              placeholder="e.g. 10.00"
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Indication (I, {unit}):</label>
            <input
              type="number"
              step="any"
              required
              value={indicationValue}
              onChange={(e) => setIndicationValue(e.target.value)}
              placeholder="e.g. 10.005"
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Added Load (&Delta;L, {unit}):</label>
            <input
              type="number"
              step="any"
              value={additionalLoad}
              onChange={(e) => setAdditionalLoad(e.target.value)}
              placeholder="Changeover &Delta;L"
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Zero Error (E0, {unit}):</label>
            <input
              type="number"
              step="any"
              value={zeroError}
              onChange={(e) => setZeroError(e.target.value)}
              placeholder="E0"
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record</span>
            </button>
          </div>
        </form>
      </div>

      {/* Observations Table with Deterministic Calculation Columns */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wide">
            Observations & Derived Compliance Table ({observations.length} points recorded)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Raw observations are strictly immutable
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5">No.</th>
                <th className="px-3 py-2.5">Phase</th>
                <th className="px-3 py-2.5">Test Load (L)</th>
                <th className="px-3 py-2.5">Indication (I)</th>
                <th className="px-3 py-2.5">Changeover (&Delta;L)</th>
                <th className="px-3 py-2.5">Raw Error (E)</th>
                <th className="px-3 py-2.5">Zero Error (E0)</th>
                <th className="px-3 py-2.5">Corrected (Ec)</th>
                <th className="px-3 py-2.5">MPE Limit</th>
                <th className="px-3 py-2.5">Result</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {observations.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400 font-sans">
                    No observations recorded yet. Enter readings above or click "Generate Recommended Plan".
                  </td>
                </tr>
              ) : (
                observations.map((obs, idx) => {
                  const matchingResult = results[idx];
                  const isPass = matchingResult?.pass_fail === 'PASS';
                  const isFail = matchingResult?.pass_fail === 'FAIL';

                  return (
                    <tr key={obs.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 text-slate-500 font-sans font-medium">{obs.sequence_no}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${obs.direction === 'LOADING' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                          {obs.direction}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900">{obs.load_value} {obs.load_unit}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{obs.indication_value} {obs.indication_unit}</td>
                      <td className="px-3 py-2 text-slate-600">{obs.additional_load !== null ? `${obs.additional_load} ${obs.load_unit}` : '-'}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {obs.raw_error !== null && obs.raw_error !== undefined ? `${obs.raw_error > 0 ? '+' : ''}${Number(obs.raw_error).toFixed(4)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-500 font-sans text-[11px]">
                        {obs.zero_error !== null && obs.zero_error !== undefined ? `${Number(obs.zero_error) > 0 ? '+' : ''}${Number(obs.zero_error).toFixed(4)}` : '0.0000'}
                      </td>
                      <td className="px-3 py-2 font-bold text-blue-800">
                        {obs.corrected_error !== null && obs.corrected_error !== undefined ? `${obs.corrected_error > 0 ? '+' : ''}${Number(obs.corrected_error).toFixed(4)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {matchingResult ? `+/-${matchingResult.limit_value} ${obs.load_unit}` : '-'}
                      </td>
                      <td className="px-3 py-2 font-sans">
                        {matchingResult ? (
                          isPass ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              PASS
                            </span>
                          ) : isFail ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              <XCircle className="w-3.5 h-3.5" />
                              FAIL
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {matchingResult.pass_fail}
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending calc</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteObservation(obs.id)}
                          className="p-1 text-slate-400 hover:text-red-700 rounded transition-colors"
                          title="Delete observation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
