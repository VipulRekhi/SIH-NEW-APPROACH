import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { InstrumentService } from '../../services/instrumentService';
import { TestSessionService } from '../../services/testSessionService';
import type { Instrument } from '../../types';
import type { TestType, RegulatoryMode } from '../../types/test.types';
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Thermometer,
  Droplets,
  Gauge,
  FileCheck
} from 'lucide-react';

export const CreateTestSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedInstId = searchParams.get('instrumentId');

  const [step, setStep] = useState<number>(1);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State
  const [regulatoryMode, setRegulatoryMode] = useState<RegulatoryMode>('TYPE_EVALUATION');
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [temperature, setTemperature] = useState<string>('22.5');
  const [humidity, setHumidity] = useState<string>('50.0');
  const [pressure, setPressure] = useState<string>('1013.25');
  const [envRemarks, setEnvRemarks] = useState<string>('Laboratory reference conditions stabilized');
  const [standardIdentifier, setStandardIdentifier] = useState<string>('STD-F1-01');
  const [certNumber, setCertNumber] = useState<string>('NPL/2026/CAL/4012');
  const [certValidUntil, setCertValidUntil] = useState<string>('2027-12-31');
  const [notes, setNotes] = useState<string>('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const [instRes, typesRes] = await Promise.all([
          InstrumentService.list({ limit: 100, status: 'ACTIVE' }),
          TestSessionService.getTestTypes()
        ]);
        setInstruments(instRes.instruments);
        setTestTypes(typesRes);

        // Preselect instrument if in URL
        if (preselectedInstId) {
          const matched = instRes.instruments.find(i => i.id === preselectedInstId);
          if (matched) setSelectedInstrument(matched);
        } else if (instRes.instruments.length > 0) {
          // Default to first active instrument (e.g. Essae DS-252)
          setSelectedInstrument(instRes.instruments[0]);
        }

        // Default selected tests to all IMPLEMENTED tests
        const implementedIds = typesRes
          .filter(t => t.implementation_state === 'IMPLEMENTED')
          .map(t => t.id);
        setSelectedTests(implementedIds);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load initial test setup.');
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [preselectedInstId]);

  // Metrological pre-validation check (Clause 3.4.2: d < e <= 10d)
  const validateMetroParams = (inst: Instrument) => {
    const d = inst.scale_interval;
    const e = inst.verification_scale_interval;
    const errors: string[] = [];

    if (d <= 0 || e <= 0) errors.push('Scale intervals must be strictly positive');
    if (d >= e && inst.accuracy_class !== 'I') errors.push('Scale interval d must be strictly less than verification scale interval e');
    if (e > 10 * d) errors.push(`Verification interval e cannot exceed 10 * d (10 * ${d} = ${10 * d})`);

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleStartSession = async () => {
    if (!selectedInstrument) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await TestSessionService.createSession({
        instrumentId: selectedInstrument.id,
        regulatoryMode,
        testDate,
        environmentalConditions: {
          temperature: parseFloat(temperature),
          humidity: parseFloat(humidity),
          atmosphericPressure: parseFloat(pressure),
          remarks: envRemarks
        },
        referenceStandards: [
          {
            identifier: standardIdentifier,
            nominalMass: selectedInstrument.max_capacity,
            unit: selectedInstrument.unit,
            certificateNumber: certNumber,
            certificateValidUntil: certValidUntil,
            reportedError: 0.001
          }
        ],
        selectedTestTypeIds: selectedTests,
        notes
      });

      navigate(`/app/tests/${result.session.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to initiate test session.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-blue-700 rounded-full animate-spin" />
        <span className="text-xs font-medium text-slate-600">Initializing legal metrology test engine...</span>
      </div>
    );
  }

  const metroCheck = selectedInstrument ? validateMetroParams(selectedInstrument) : { isValid: false, errors: [] };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/app/tests"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              OIML Recommendation R 76-1:2006
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Initiate Metrological Testing Session
            </h2>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`px-2.5 py-1 rounded font-bold ${step === 1 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
            1. Instrument
          </span>
          <span className={`px-2.5 py-1 rounded font-bold ${step === 2 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
            2. Mode
          </span>
          <span className={`px-2.5 py-1 rounded font-bold ${step === 3 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
            3. Environment
          </span>
          <span className={`px-2.5 py-1 rounded font-bold ${step === 4 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
            4. Applicable Tests
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: INSTRUMENT SELECTION & PRE-VALIDATION */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Step 1: Verified Instrument Selection & Metrological Validation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an instrument verified in Phase 2. Technical parameters are validated against OIML R-76 Clause 3.4.2 before testing begins.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Verified Laboratory Instrument:
            </label>
            <select
              value={selectedInstrument?.id || ''}
              onChange={(e) => {
                const found = instruments.find(i => i.id === e.target.value);
                setSelectedInstrument(found || null);
              }}
              className="w-full text-xs border border-slate-300 rounded p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {instruments.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.manufacturer} {inst.model_number} (SN: {inst.serial_number}) — Class {inst.accuracy_class} (Max {inst.max_capacity} {inst.unit})
                </option>
              ))}
            </select>
          </div>

          {selectedInstrument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Accuracy Class</span>
                  <span className="font-bold text-blue-800 font-mono text-sm">Class {selectedInstrument.accuracy_class}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Capacity Range</span>
                  <span className="font-mono text-slate-900 font-bold">{selectedInstrument.min_capacity} to {selectedInstrument.max_capacity} {selectedInstrument.unit}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Verification Interval (e)</span>
                  <span className="font-mono text-slate-900 font-bold">e = {selectedInstrument.verification_scale_interval} {selectedInstrument.unit}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Scale Interval (d)</span>
                  <span className="font-mono text-slate-900 font-bold">d = {selectedInstrument.scale_interval} {selectedInstrument.unit}</span>
                </div>
              </div>

              {/* Clause 3.4.2 Pre-validation Status */}
              <div className={`p-4 rounded-lg border text-xs ${metroCheck.isValid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                <div className="flex items-center gap-2 font-bold mb-1">
                  {metroCheck.isValid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>OIML R-76 Clause 3.4.2 Metrological Pre-validation Passed</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Metrological Pre-validation Failed: Non-Compliant Interval Ratio</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] font-mono">
                  Ratio check: d ({selectedInstrument.scale_interval}) &lt; e ({selectedInstrument.verification_scale_interval}) &le; 10d ({10 * selectedInstrument.scale_interval})
                </div>
                {!metroCheck.isValid && (
                  <ul className="list-disc list-inside mt-2 text-red-700">
                    {metroCheck.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3">
            <button
              type="button"
              disabled={!selectedInstrument || !metroCheck.isValid}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded transition-colors"
            >
              <span>Continue to Regulatory Mode</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: REGULATORY MODE */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Step 2: Select Regulatory Testing Mode
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Determines MPE limits and repeatability count according to OIML R 76-1:2006.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`p-4 border rounded-lg cursor-pointer transition-all ${regulatoryMode === 'TYPE_EVALUATION' ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-purple-900">Type Evaluation / Approval</span>
                <input
                  type="radio"
                  name="regMode"
                  value="TYPE_EVALUATION"
                  checked={regulatoryMode === 'TYPE_EVALUATION'}
                  onChange={() => setRegulatoryMode('TYPE_EVALUATION')}
                  className="text-purple-600"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Full metrological type examination. Applies Table 6 MPE limits, 10-reading repeatability series (at 50% and 100% Max), and 1.4d digital discrimination.
              </p>
            </label>

            <label className={`p-4 border rounded-lg cursor-pointer transition-all ${regulatoryMode === 'INITIAL_VERIFICATION' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-blue-900">Initial Verification</span>
                <input
                  type="radio"
                  name="regMode"
                  value="INITIAL_VERIFICATION"
                  checked={regulatoryMode === 'INITIAL_VERIFICATION'}
                  onChange={() => setRegulatoryMode('INITIAL_VERIFICATION')}
                  className="text-blue-600"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">
                First verification of a new or repaired instrument before service. Applies Table 6 standard MPE limits.
              </p>
            </label>

            <label className={`p-4 border rounded-lg cursor-pointer transition-all ${regulatoryMode === 'SUBSEQUENT_VERIFICATION' ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-indigo-900">Subsequent Periodic Verification</span>
                <input
                  type="radio"
                  name="regMode"
                  value="SUBSEQUENT_VERIFICATION"
                  checked={regulatoryMode === 'SUBSEQUENT_VERIFICATION'}
                  onChange={() => setRegulatoryMode('SUBSEQUENT_VERIFICATION')}
                  className="text-indigo-600"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Routine annual or periodic legal-metrology verification. Error limits equal initial verification MPE.
              </p>
            </label>

            <label className={`p-4 border rounded-lg cursor-pointer transition-all ${regulatoryMode === 'SERVICE_INSPECTION' ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-amber-900">Service Inspection (Clause 3.5.2)</span>
                <input
                  type="radio"
                  name="regMode"
                  value="SERVICE_INSPECTION"
                  checked={regulatoryMode === 'SERVICE_INSPECTION'}
                  onChange={() => setRegulatoryMode('SERVICE_INSPECTION')}
                  className="text-amber-600"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Surveillance inspection of instruments in service. In accordance with Clause 3.5.2, maximum permissible errors are twice Table 6 values (2x MPE).
              </p>
            </label>
          </div>

          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors"
            >
              <span>Continue to Environment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ENVIRONMENT & TEST STANDARDS */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Step 3: Laboratory Environment & Traceable Reference Standards
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Record laboratory ambient conditions and standard test weights (Clause 3.7.1).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1">
                <Thermometer className="w-3.5 h-3.5 text-red-500" />
                <span>Ambient Temperature (°C):</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded p-2 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1">
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                <span>Relative Humidity (%):</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={humidity}
                onChange={(e) => setHumidity(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded p-2 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1">
                <Gauge className="w-3.5 h-3.5 text-slate-500" />
                <span>Atmospheric Pressure (hPa):</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={pressure}
                onChange={(e) => setPressure(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded p-2 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-600 font-semibold block mb-1">Test Date:</label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-600 font-semibold block mb-1">Ambient Remarks:</label>
              <input
                type="text"
                value={envRemarks}
                onChange={(e) => setEnvRemarks(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Session Notes:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Type evaluation test session conducted under SIH 2026 protocol"
              className="w-full text-xs border border-slate-300 rounded p-2 bg-white"
            />
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-bold text-slate-900 uppercase">
                OIML R 111 Standard Weights Suitability (Clause 3.7.1)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Weight Set Identifier:</span>
                <input
                  type="text"
                  value={standardIdentifier}
                  onChange={(e) => setStandardIdentifier(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white"
                />
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Calibration Certificate No:</span>
                <input
                  type="text"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
                />
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Certificate Valid Until:</span>
                <input
                  type="date"
                  value={certValidUntil}
                  onChange={(e) => setCertValidUntil(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors"
            >
              <span>Continue to Test Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: APPLICABLE R-76 TESTS MATRIX */}
      {step === 4 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Step 4: Select Applicable OIML R-76 Tests
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tests dynamically evaluated by the Applicability Engine based on instrument configuration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testTypes.map((t) => {
              const isSelected = selectedTests.includes(t.id);
              const isImplemented = t.implementation_state === 'IMPLEMENTED';
              const isPartial = t.implementation_state === 'PARTIAL';
              const isDeferred = t.implementation_state === 'DEFERRED';

              return (
                <div
                  key={t.id}
                  className={`p-3.5 border rounded-lg transition-all ${
                    isDeferred
                      ? 'bg-slate-100/70 border-slate-200 opacity-60'
                      : isSelected
                        ? 'border-blue-600 bg-blue-50/40'
                        : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-900">{t.name}</span>
                        {isImplemented && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            IMPLEMENTED
                          </span>
                        )}
                        {isPartial && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            PARTIAL (REVIEW)
                          </span>
                        )}
                        {isDeferred && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-600">
                            DEFERRED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{t.description}</p>
                      <div className="text-[10px] text-blue-800 font-mono mt-1 font-semibold">
                        Ref: {t.r76_reference}
                      </div>
                    </div>

                    {!isDeferred && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTests([...selectedTests, t.id]);
                          } else {
                            setSelectedTests(selectedTests.filter(id => id !== t.id));
                          }
                        }}
                        className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={submitting || selectedTests.length === 0}
              onClick={handleStartSession}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded shadow-xs transition-colors"
            >
              <FlaskConical className="w-4 h-4" />
              <span>{submitting ? 'Initiating Session...' : 'Start Testing Workspace'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
