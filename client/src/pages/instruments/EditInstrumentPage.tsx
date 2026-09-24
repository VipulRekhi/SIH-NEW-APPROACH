import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { InstrumentService } from '../../services/instrumentService';
import type { InstrumentStatus } from '../../types';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export const EditInstrumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [manufacturer, setManufacturer] = useState<string>('');
  const [modelNumber, setModelNumber] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [instrumentType, setInstrumentType] = useState<string>('');
  const [accuracyClass, setAccuracyClass] = useState<string>('III');
  const [maxCapacity, setMaxCapacity] = useState<string>('');
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [scaleInterval, setScaleInterval] = useState<string>('');
  const [verificationScaleInterval, setVerificationScaleInterval] = useState<string>('');
  const [unit, setUnit] = useState<string>('kg');
  const [status, setStatus] = useState<InstrumentStatus>('ACTIVE');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const data = await InstrumentService.getById(id);
        const inst = data.instrument;
        setManufacturer(inst.manufacturer);
        setModelNumber(inst.model_number);
        setSerialNumber(inst.serial_number);
        setInstrumentType(inst.instrument_type);
        setAccuracyClass(inst.accuracy_class);
        setMaxCapacity(inst.max_capacity.toString());
        setMinCapacity(inst.min_capacity.toString());
        setScaleInterval(inst.scale_interval.toString());
        setVerificationScaleInterval(inst.verification_scale_interval.toString());
        setUnit(inst.unit);
        setStatus(inst.status);
        setNotes(inst.notes || '');
      } catch (err: any) {
        setErrorMessage(err.response?.data?.error?.message || 'Failed to load instrument.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setErrorMessage(null);

    const maxVal = parseFloat(maxCapacity);
    const minVal = parseFloat(minCapacity);
    const dVal = parseFloat(scaleInterval);
    const eVal = parseFloat(verificationScaleInterval);

    if (isNaN(maxVal) || maxVal <= 0) {
      setErrorMessage('Maximum capacity must be positive.');
      return;
    }
    if (isNaN(minVal) || minVal < 0) {
      setErrorMessage('Minimum capacity cannot be negative.');
      return;
    }
    if (maxVal < minVal) {
      setErrorMessage('Maximum capacity cannot be less than minimum capacity.');
      return;
    }
    if (isNaN(dVal) || dVal <= 0 || isNaN(eVal) || eVal <= 0) {
      setErrorMessage('Intervals must be positive numbers.');
      return;
    }

    setIsSubmitting(true);
    try {
      await InstrumentService.update(id, {
        manufacturer,
        model_number: modelNumber,
        serial_number: serialNumber,
        instrument_type: instrumentType,
        accuracy_class: accuracyClass,
        max_capacity: maxVal,
        min_capacity: minVal,
        scale_interval: dVal,
        verification_scale_interval: eVal,
        unit,
        status,
        notes: notes || null
      });

      navigate(`/app/instruments/${id}`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to update instrument.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-blue-700 rounded-full animate-spin" />
        <span className="text-xs font-medium text-slate-600">Loading instrument...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to={`/app/instruments/${id}`}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Edit Instrument Specifications</h2>
          <p className="text-xs text-slate-500">Update technical parameters or status.</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2.5 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2 mb-4">
            Basic Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Manufacturer</label>
              <input
                type="text"
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Model Number</label>
              <input
                type="text"
                required
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Serial Number</label>
              <input
                type="text"
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2 mb-4">
            Metrological Specifications
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Accuracy Class</label>
              <select
                value={accuracyClass}
                onChange={(e) => setAccuracyClass(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none bg-white"
              >
                <option value="I">Class I</option>
                <option value="II">Class II</option>
                <option value="III">Class III</option>
                <option value="IIII">Class IIII</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Maximum Capacity</label>
              <input
                type="number"
                step="any"
                required
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Minimum Capacity</label>
              <input
                type="number"
                step="any"
                required
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Verification Interval (e)</label>
              <input
                type="number"
                step="any"
                required
                value={verificationScaleInterval}
                onChange={(e) => setVerificationScaleInterval(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Scale Interval (d)</label>
              <input
                type="number"
                step="any"
                required
                value={scaleInterval}
                onChange={(e) => setScaleInterval(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 outline-none"
          />
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <Link
            to={`/app/instruments/${id}`}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded shadow-xs transition-colors"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
