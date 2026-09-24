import React, { useState, useEffect } from 'react';
import { TestSessionService } from '../../../services/testSessionService';
import type { TestSessionTest, TestObservation } from '../../../types/test.types';
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Loader2,
  Sparkles
} from 'lucide-react';

interface Props {
  sessionId: string;
  test: TestSessionTest;
  unit: string;
  scaleIntervalD: number;
  maxCapacity: number;
  onUpdated: () => void;
}

export const DiscriminationTest: React.FC<Props> = ({
  sessionId,
  test,
  unit,
  scaleIntervalD,
  maxCapacity,
  onUpdated
}) => {
  const [observations, setObservations] = useState<TestObservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Mandated added load for digital d >= 5mg is strictly 1.4d (Clause 3.8)
  const required14d = (1.4 * scaleIntervalD).toFixed(4);

  const [testLoad, setTestLoad] = useState<string>((maxCapacity * 0.5).toString());
  const [initialIndication, setInitialIndication] = useState<string>((maxCapacity * 0.5).toString());
  const [addedLoad, setAddedLoad] = useState<string>(required14d);
  const [resultingIndication, setResultingIndication] = useState<string>(
    (maxCapacity * 0.5 + scaleIntervalD).toFixed(4)
  );

  const expectedIndication = (parseFloat(initialIndication || '0') + scaleIntervalD).toFixed(4);
  const observedDeviation = Math.abs(
    parseFloat(resultingIndication || '0') - parseFloat(expectedIndication)
  ).toFixed(4);

  const fetchObservations = async () => {
    setLoading(true);
    try {
      const data = await TestSessionService.getObservations(sessionId, test.id);
      setObservations(data.observations);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load discrimination observations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [sessionId, test.id]);

  const handleApplyPreset = (load: number) => {
    const lStr = load.toString();
    setTestLoad(lStr);
    setInitialIndication(lStr);
    setAddedLoad(required14d);
    setResultingIndication((load + scaleIntervalD).toFixed(4));
  };

  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testLoad || !resultingIndication) return;

    setCalculating(true);
    setError(null);
    try {
      await TestSessionService.addObservation(sessionId, test.id, {
        sequenceNo: observations.length + 1,
        loadValue: parseFloat(testLoad),
        loadUnit: unit,
        indicationValue: parseFloat(resultingIndication),
        indicationUnit: unit,
        additionalLoad: parseFloat(addedLoad),
        remarks: `initial=${initialIndication}`
      });

      // Recalculate test deterministically
      await TestSessionService.calculateTest(sessionId, test.id);
      await fetchObservations();
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to record discrimination observation.');
    } finally {
      setCalculating(false);
    }
  };

  const handleDeleteObservation = async (obsId: string) => {
    try {
      await TestSessionService.deleteObservation(sessionId, test.id, obsId);
      await fetchObservations();
      onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete observation.');
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
            <span className="text-xs font-semibold text-slate-700">Clause 3.8 & Annex A.4.8.2</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Discrimination Test (Digital 1.4d I + d Rule)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Under OIML R 76-1:2006 A.4.8.2, gently placing an extra load equal to 1.4d ({required14d} {unit}) on the receptor must produce an indication stepped to exactly <strong>I + d</strong>.
          </p>
        </div>

        {isPass && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>PASS (I + d Mandate Satisfied)</span>
          </span>
        )}
        {isFail && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-800 bg-red-50 rounded border border-red-200">
            <XCircle className="w-4 h-4 text-red-600" />
            <span>FAIL (Non-Compliant Step / Deviation)</span>
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
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 font-bold ml-2">Dismiss</button>
        </div>
      )}

      {/* R-76 Prescribed Load Presets */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Clause 3.8 Mandated Test Loads:</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleApplyPreset(scaleIntervalD * 20)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-mono text-[11px] text-slate-800 shadow-2xs"
          >
            Min ({(scaleIntervalD * 20).toFixed(2)} {unit})
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(maxCapacity * 0.5)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-mono text-[11px] text-slate-800 shadow-2xs"
          >
            0.5 Max ({(maxCapacity * 0.5).toFixed(2)} {unit})
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(maxCapacity)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-mono text-[11px] text-slate-800 shadow-2xs"
          >
            Max ({maxCapacity.toFixed(2)} {unit})
          </button>
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Record 1.4d Discrimination Observation</span>
        </div>

        <form onSubmit={handleAddReading} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-slate-600 font-semibold block mb-1">
                Base Test Load ({unit}):
              </label>
              <input
                type="number"
                step="any"
                required
                value={testLoad}
                onChange={(e) => {
                  setTestLoad(e.target.value);
                  setInitialIndication(e.target.value);
                  setResultingIndication((parseFloat(e.target.value || '0') + scaleIntervalD).toFixed(4));
                }}
                className="w-full border border-slate-300 rounded p-2 bg-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">
                Initial Indication I ({unit}):
              </label>
              <input
                type="number"
                step="any"
                required
                value={initialIndication}
                onChange={(e) => {
                  setInitialIndication(e.target.value);
                  setResultingIndication((parseFloat(e.target.value || '0') + scaleIntervalD).toFixed(4));
                }}
                className="w-full border border-slate-300 rounded p-2 bg-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">
                Mandated Load (1.4d = {required14d} {unit}):
              </label>
              <input
                type="number"
                step="any"
                required
                value={addedLoad}
                onChange={(e) => setAddedLoad(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white font-mono font-bold text-blue-800"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">
                Observed Resulting Indication ({unit}):
              </label>
              <input
                type="number"
                step="any"
                required
                value={resultingIndication}
                onChange={(e) => setResultingIndication(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded font-mono text-xs flex items-center justify-between">
            <div>
              <span>Expected Indication: <strong>{expectedIndication} {unit}</strong> (I + d)</span>
              <span className="text-slate-400 mx-2">&bull;</span>
              <span>Observed Result: <strong>{resultingIndication} {unit}</strong></span>
              <span className="text-slate-400 mx-2">&bull;</span>
              <span>Deviation: <strong>{observedDeviation} {unit}</strong></span>
            </div>
            <span className={`text-[11px] font-sans font-bold px-2 py-0.5 rounded ${parseFloat(observedDeviation) === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {parseFloat(observedDeviation) === 0 ? 'COMPLIANT STEP (I + d)' : 'INVALID / NON-COMPLIANT'}
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={calculating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{calculating ? 'Recording...' : 'Record & Evaluate Discrimination'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Observations Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wide">
            Discrimination Observations ({observations.length} recorded)
          </span>
          {summary && (
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {isPass ? 'ALL TESTS SATISFIED I + d' : 'NON-COMPLIANT SHIFT DETECTED'}
            </span>
          )}
        </div>

        <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase font-sans">
            <tr>
              <th className="px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Base Load (L)</th>
              <th className="px-3 py-2.5">Initial (I)</th>
              <th className="px-3 py-2.5">Added Load (1.4d)</th>
              <th className="px-3 py-2.5">Expected (I + d)</th>
              <th className="px-3 py-2.5">Observed Indication</th>
              <th className="px-3 py-2.5">Deviation</th>
              <th className="px-3 py-2.5">Result</th>
              <th className="px-3 py-2.5 text-right font-sans">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {observations.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-sans">
                  No discrimination observations recorded yet. Select a preset or enter values above.
                </td>
              </tr>
            ) : (
              observations.map((obs, idx) => {
                const initVal = obs.remarks?.includes('initial=')
                  ? parseFloat(obs.remarks.split('initial=')[1])
                  : obs.load_value;
                const expVal = (initVal + scaleIntervalD).toFixed(4);
                const devVal = Math.abs(obs.indication_value - parseFloat(expVal)).toFixed(4);
                const isObsPass = parseFloat(devVal) === 0;

                return (
                  <tr key={obs.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500 font-sans">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{obs.load_value} {obs.load_unit}</td>
                    <td className="px-3 py-2">{initVal} {obs.load_unit}</td>
                    <td className="px-3 py-2 text-blue-700 font-semibold">{obs.additional_load} {obs.load_unit}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{expVal} {obs.load_unit}</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{obs.indication_value} {obs.indication_unit}</td>
                    <td className="px-3 py-2 text-slate-600">{devVal} {obs.load_unit}</td>
                    <td className="px-3 py-2 font-sans font-bold">
                      {isObsPass ? (
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">PASS (I + d)</span>
                      ) : (
                        <span className="text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">FAIL (Invalid)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => handleDeleteObservation(obs.id)}
                        className="p-1 text-slate-400 hover:text-red-700 transition-colors"
                        title="Delete reading"
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
  );
};
