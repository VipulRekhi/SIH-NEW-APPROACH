import React, { useState, useEffect } from 'react';
import { TestSessionService } from '../../../services/testSessionService';
import type { TestSessionTest, TestObservation } from '../../../types/test.types';
import {
  Plus,
  Play,
  Trash2,
  Layers,
  MapPin,
  Loader2
} from 'lucide-react';

interface Props {
  sessionId: string;
  test: TestSessionTest;
  unit: string;
  maxCapacity: number;
  onUpdated: () => void;
}

export const EccentricLoadingTest: React.FC<Props> = ({ sessionId, test, unit, maxCapacity, onUpdated }) => {
  const [observations, setObservations] = useState<TestObservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Default test load for <=4 supports is 1/3 Max
  const defaultTestLoad = (maxCapacity / 3).toFixed(2);
  const [testLoad, setTestLoad] = useState<string>(defaultTestLoad);
  const [position, setPosition] = useState<string>('CENTER');
  const [indicationValue, setIndicationValue] = useState<string>('');
  const [additionalLoad, setAdditionalLoad] = useState<string>('');

  const standardPositions = [
    { id: 'CENTER', label: 'Position 1: Center' },
    { id: 'FRONT_LEFT', label: 'Position 2: Front-Left Quadrant' },
    { id: 'FRONT_RIGHT', label: 'Position 3: Front-Right Quadrant' },
    { id: 'REAR_LEFT', label: 'Position 4: Rear-Left Quadrant' },
    { id: 'REAR_RIGHT', label: 'Position 5: Rear-Right Quadrant' }
  ];

  const fetchObservations = async () => {
    setLoading(true);
    try {
      const data = await TestSessionService.getObservations(sessionId, test.id);
      setObservations(data.observations);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load eccentric observations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [sessionId, test.id]);

  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicationValue || !testLoad) return;

    if (observations.some(o => o.position === position)) {
      alert(`Position "${position}" has already been recorded. Duplicate positions are not allowed under OIML R 76-1:2006.`);
      return;
    }

    try {
      await TestSessionService.addObservation(sessionId, test.id, {
        sequenceNo: observations.length + 1,
        position,
        loadValue: parseFloat(testLoad),
        loadUnit: unit,
        indicationValue: parseFloat(indicationValue),
        indicationUnit: unit,
        additionalLoad: additionalLoad ? parseFloat(additionalLoad) : null,
        zeroError: null
      });

      setIndicationValue('');
      setAdditionalLoad('');

      // Auto-advance to next untested position
      const unrecorded = standardPositions.find(p => !observations.some(o => o.position === p.id) && p.id !== position);
      if (unrecorded) {
        setPosition(unrecorded.id);
      }

      await fetchObservations();
      onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record eccentric reading.');
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
            <span className="text-xs font-semibold text-slate-700">Clause 3.6.2 & Annex A.4.7</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Eccentric Loading Test
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test load formula: 1/3 &times; (Max + Tare) for &le; 4 supports. Loads applied successively in center and 4 quarter segments.
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

      {/* Test Load Calculation Callout */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900 font-mono">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-700" />
          <span>Mandated Test Load: 1/3 * Max = 1/3 * ({maxCapacity} {unit}) = <strong>{defaultTestLoad} {unit}</strong></span>
        </div>
        <span className="text-[11px] font-sans text-blue-700">Clause 3.6.2.1 (&le; 4 points of support)</span>
      </div>

      {/* Add Observation Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-blue-700" />
          <span>Record Position Observation</span>
        </div>

        <form onSubmit={handleAddReading} className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-slate-500 block mb-1">Load Position:</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-medium"
            >
              {standardPositions.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Applied Load ({unit}):</label>
            <input
              type="number"
              step="any"
              required
              value={testLoad}
              onChange={(e) => setTestLoad(e.target.value)}
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Indication ({unit}):</label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              value={indicationValue}
              onChange={(e) => setIndicationValue(e.target.value)}
              placeholder="e.g. 10.005"
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Changeover (&Delta;L, {unit}):</label>
            <input
              type="number"
              step="any"
              value={additionalLoad}
              onChange={(e) => setAdditionalLoad(e.target.value)}
              placeholder="Optional &Delta;L"
              className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Position</span>
            </button>
          </div>
        </form>
      </div>

      {/* Observations & Positions Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wide">
            Position Readings ({observations.length} / 5 recorded)
          </span>
          {summary && (
            observations.length < 5 ? (
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800">
                INCOMPLETE ({observations.length} OF 5 POSITIONS)
              </span>
            ) : isPass ? (
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                PASS (ALL 5 POSITIONS COMPLIANT)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-red-100 text-red-800">
                FAIL (NON-COMPLIANT POSITION DETECTED)
              </span>
            )
          )}
        </div>

        <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase font-sans">
            <tr>
              <th className="px-3 py-2.5">Position</th>
              <th className="px-3 py-2.5">Load</th>
              <th className="px-3 py-2.5">Indication</th>
              <th className="px-3 py-2.5">Changeover (&Delta;L)</th>
              <th className="px-3 py-2.5">Raw Error (E)</th>
              <th className="px-3 py-2.5">Corrected (Ec)</th>
              <th className="px-3 py-2.5">MPE Limit</th>
              <th className="px-3 py-2.5">Result</th>
              <th className="px-3 py-2.5 text-right font-sans">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {observations.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-sans">
                  No eccentric position observations recorded yet. Select position and record observation above.
                </td>
              </tr>
            ) : (
              observations.map((obs) => {
                const posObj = standardPositions.find(p => p.id === obs.position);
                const posSummary = summary?.positions?.find((p: any) => p.position === obs.position);
                const isPosPass = posSummary ? posSummary.status === 'PASS' : null;

                return (
                  <tr key={obs.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-800 font-sans font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>{posObj?.label || obs.position}</span>
                    </td>
                    <td className="px-3 py-2">{obs.load_value} {obs.load_unit}</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{obs.indication_value} {obs.indication_unit}</td>
                    <td className="px-3 py-2 text-slate-600">{obs.additional_load !== null && obs.additional_load !== undefined ? `${obs.additional_load} ${obs.load_unit}` : '-'}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {obs.raw_error !== null && obs.raw_error !== undefined ? `${Number(obs.raw_error) > 0 ? '+' : ''}${Number(obs.raw_error).toFixed(4)}` : '-'}
                    </td>
                    <td className="px-3 py-2 font-bold text-blue-800">
                      {obs.corrected_error !== null && obs.corrected_error !== undefined ? `${Number(obs.corrected_error) > 0 ? '+' : ''}${Number(obs.corrected_error).toFixed(4)}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {posSummary ? `+/-${posSummary.mpe} ${obs.load_unit}` : '-'}
                    </td>
                    <td className="px-3 py-2 font-sans font-bold">
                      {isPosPass === true ? (
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">PASS</span>
                      ) : isPosPass === false ? (
                        <span className="text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">FAIL</span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic font-normal">Pending calc</span>
                      )}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
