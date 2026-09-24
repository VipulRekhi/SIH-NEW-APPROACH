import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { InstrumentService } from '../../services/instrumentService';
import type { InstrumentFile, OcrResult } from '../../types';
import {
  ScanLine,
  FileText,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Save,
  RotateCcw
} from 'lucide-react';

export const CreateInstrumentPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'manual' ? 'manual' : 'ocr';
  const [mode, setMode] = useState<'ocr' | 'manual'>(initialMode);

  const navigate = useNavigate();

  // OCR state
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanResult, setScanResult] = useState<{
    file: InstrumentFile;
    ocr: OcrResult;
  } | null>(null);
  const [showRawText, setShowRawText] = useState<boolean>(false);

  // Instrument Form Fields
  const [manufacturer, setManufacturer] = useState<string>('');
  const [modelNumber, setModelNumber] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [instrumentType, setInstrumentType] = useState<string>(
    'Non-Automatic Weighing Instrument (Bench/Platform Scale)'
  );
  const [accuracyClass, setAccuracyClass] = useState<string>('III');
  const [maxCapacity, setMaxCapacity] = useState<string>('');
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [scaleInterval, setScaleInterval] = useState<string>('');
  const [verificationScaleInterval, setVerificationScaleInterval] = useState<string>('');
  const [unit, setUnit] = useState<string>('kg');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Switch modes
  const handleTabChange = (newMode: 'ocr' | 'manual') => {
    setMode(newMode);
    setSearchParams({ mode: newMode });
  };

  // Handle image upload and OCR processing
  const handleFileSelect = async (file: File) => {
    setOcrFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);
    setIsScanning(true);
    setScanStep('Uploading nameplate image...');

    try {
      setTimeout(() => setScanStep('Running local Tesseract OCR engine...'), 800);
      setTimeout(() => setScanStep('Extracting OIML R-76 technical fields...'), 1800);

      const result = await InstrumentService.scanOcr(file);
      setScanResult(result);

      // Pre-fill form fields from extracted OCR data without overwriting verified controls
      const ext = result.ocr.extracted_data;
      if (ext.manufacturer) setManufacturer(ext.manufacturer);
      if (ext.model_number) setModelNumber(ext.model_number);
      if (ext.serial_number) setSerialNumber(ext.serial_number);
      if (ext.instrument_type) setInstrumentType(ext.instrument_type);
      if (ext.accuracy_class) setAccuracyClass(ext.accuracy_class);
      if (ext.max_capacity !== null) setMaxCapacity(ext.max_capacity.toString());
      if (ext.min_capacity !== null) setMinCapacity(ext.min_capacity.toString());
      if (ext.scale_interval !== null) setScaleInterval(ext.scale_interval.toString());
      if (ext.verification_scale_interval !== null) {
        setVerificationScaleInterval(ext.verification_scale_interval.toString());
      }
      if (ext.unit) setUnit(ext.unit);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message ||
          'Failed to process nameplate OCR. You can enter details manually.'
      );
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  // Quick load sample nameplate for evaluation
  const handleLoadSample = async () => {
    try {
      setIsScanning(true);
      setScanStep('Loading sample nameplate...');
      const response = await fetch('/sample_nameplate.jpg');
      const blob = await response.blob();
      const file = new File([blob], 'sample_nameplate.jpg', { type: 'image/jpeg' });
      await handleFileSelect(file);
    } catch (e) {
      setErrorMessage('Could not load sample image file.');
      setIsScanning(false);
    }
  };

  // Final submission of verified instrument
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const maxVal = parseFloat(maxCapacity);
    const minVal = parseFloat(minCapacity);
    const dVal = parseFloat(scaleInterval);
    const eVal = parseFloat(verificationScaleInterval);

    if (isNaN(maxVal) || maxVal <= 0) {
      setErrorMessage('Maximum capacity must be a positive numeric value.');
      return;
    }
    if (isNaN(minVal) || minVal < 0) {
      setErrorMessage('Minimum capacity must be non-negative.');
      return;
    }
    if (maxVal < minVal) {
      setErrorMessage('Maximum capacity cannot be less than minimum capacity.');
      return;
    }
    if (isNaN(dVal) || dVal <= 0 || isNaN(eVal) || eVal <= 0) {
      setErrorMessage('Scale interval (d) and verification interval (e) must be positive numeric values.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await InstrumentService.create({
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
        notes: notes || null,
        nameplate_file_id: scanResult?.file?.id || null,
        ocr_result_id: scanResult?.ocr?.id || null
      });

      navigate(`/app/instruments/${created.id}`);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to save verified instrument record.'
      );
      setIsSubmitting(false);
    }
  };

  const getConfidenceBadge = (fieldKey: string) => {
    if (!scanResult?.ocr?.confidence_data) return null;
    const score = scanResult.ocr.confidence_data[fieldKey];
    if (score === undefined) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
          Manual input
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
          OCR {score}%
        </span>
      );
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono flex items-center gap-1">
        <AlertTriangle className="w-2.5 h-2.5" />
        Verify ({score}%)
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/app/instruments"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Register New Instrument
            </h2>
            <p className="text-xs text-slate-500">
              Onboard equipment with automated nameplate OCR extraction or direct specification entry.
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleTabChange('ocr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              mode === 'ocr'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Nameplate OCR</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              mode === 'manual'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2.5 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* OCR SCAN INTAKE CARD (If in OCR mode and no scan result yet) */}
      {mode === 'ocr' && !scanResult && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs text-center space-y-4">
          <div className="max-w-md mx-auto">
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-200">
              <ScanLine className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Upload Nameplate Photograph
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload or drag a clear photograph of the instrument specification metal plate.
              The local Tesseract OCR engine will detect manufacturer, model, capacity, and scale intervals.
            </p>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-8 max-w-lg mx-auto bg-slate-50 transition-colors">
            {isScanning ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
                <div className="text-xs font-semibold text-slate-800 font-mono">
                  {scanStep || 'Processing OCR...'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Local offline OCR execution in progress
                </div>
              </div>
            ) : (
              <div>
                <input
                  id="nameplate-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="nameplate-upload-input"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                    Click to select nameplate image
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Supports JPG, PNG, WEBP up to 10 MB
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Evaluation Shortcut */}
          <div className="pt-2">
            <button
              id="load-sample-nameplate-btn"
              type="button"
              onClick={handleLoadSample}
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Load Sample Nameplate (Mettler Toledo XP-30)</span>
            </button>
          </div>
        </div>
      )}

      {/* VERIFICATION & DATA ENTRY STUDIO */}
      {(mode === 'manual' || scanResult) && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* If OCR was performed, show split screen */}
          {mode === 'ocr' && scanResult && (
            <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-700 flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Human Verification Required (Legal Metrology Security Boundary)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    OCR extraction is assistive. Verify all extracted values against the nameplate photograph before saving as official data.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScanResult(null);
                    setImagePreviewUrl(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Scan Different Image</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Nameplate Preview (Only shown if image uploaded) */}
            {mode === 'ocr' && imagePreviewUrl && (
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Nameplate Photograph
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ocrFile?.name || 'sample_nameplate.jpg'}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded bg-slate-900 overflow-hidden flex items-center justify-center max-h-[420px]">
                    <img
                      src={imagePreviewUrl}
                      alt="Uploaded Instrument Nameplate"
                      className="object-contain max-h-[420px] w-full"
                    />
                  </div>

                  {/* Expandable Raw OCR Inspector */}
                  {scanResult?.ocr?.raw_text && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowRawText(!showRawText)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        <span>Inspect Raw OCR Output</span>
                        {showRawText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showRawText && (
                        <pre className="mt-2 p-3 bg-slate-950 text-emerald-400 rounded text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800">
                          {scanResult.ocr.raw_text}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RIGHT COLUMN: Technical Specification Form */}
            <div className={mode === 'ocr' && imagePreviewUrl ? 'lg:col-span-7' : 'lg:col-span-12'}>
              <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2 mb-4">
                    1. Basic Identification
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Manufacturer</label>
                        {getConfidenceBadge('manufacturer')}
                      </div>
                      <input
                        id="inst-manufacturer"
                        type="text"
                        required
                        value={manufacturer}
                        onChange={(e) => setManufacturer(e.target.value)}
                        placeholder="e.g. Mettler Toledo"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Model Number</label>
                        {getConfidenceBadge('model_number')}
                      </div>
                      <input
                        id="inst-model"
                        type="text"
                        required
                        value={modelNumber}
                        onChange={(e) => setModelNumber(e.target.value)}
                        placeholder="e.g. XP-30"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Serial Number</label>
                        {getConfidenceBadge('serial_number')}
                      </div>
                      <input
                        id="inst-serial"
                        type="text"
                        required
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="e.g. MT-773921"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Instrument Type</label>
                      <input
                        id="inst-type"
                        type="text"
                        required
                        value={instrumentType}
                        onChange={(e) => setInstrumentType(e.target.value)}
                        placeholder="e.g. Bench Scale"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2 mb-4">
                    2. Metrological Technical Specifications (OIML R-76)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Accuracy Class</label>
                        {getConfidenceBadge('accuracy_class')}
                      </div>
                      <select
                        id="inst-class"
                        value={accuracyClass}
                        onChange={(e) => setAccuracyClass(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
                      >
                        <option value="I">Class I (Special / Precision)</option>
                        <option value="II">Class II (High Precision)</option>
                        <option value="III">Class III (Medium / Commercial)</option>
                        <option value="IIII">Class IIII (Ordinary)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Measurement Unit</label>
                        {getConfidenceBadge('unit')}
                      </div>
                      <select
                        id="inst-unit"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
                      >
                        <option value="kg">kg (Kilogram)</option>
                        <option value="g">g (Gram)</option>
                        <option value="mg">mg (Milligram)</option>
                        <option value="t">t (Tonne)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Maximum Capacity (Max)</label>
                        {getConfidenceBadge('max_capacity')}
                      </div>
                      <div className="relative">
                        <input
                          id="inst-max-capacity"
                          type="number"
                          step="any"
                          required
                          value={maxCapacity}
                          onChange={(e) => setMaxCapacity(e.target.value)}
                          placeholder="e.g. 30"
                          className="w-full pl-3 pr-10 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white font-mono"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 font-mono">
                          {unit}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Minimum Capacity (Min)</label>
                        {getConfidenceBadge('min_capacity')}
                      </div>
                      <div className="relative">
                        <input
                          id="inst-min-capacity"
                          type="number"
                          step="any"
                          required
                          value={minCapacity}
                          onChange={(e) => setMinCapacity(e.target.value)}
                          placeholder="e.g. 0.2"
                          className="w-full pl-3 pr-10 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white font-mono"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 font-mono">
                          {unit}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Verification Interval (e)</label>
                        {getConfidenceBadge('verification_scale_interval')}
                      </div>
                      <div className="relative">
                        <input
                          id="inst-verif-interval"
                          type="number"
                          step="any"
                          required
                          value={verificationScaleInterval}
                          onChange={(e) => setVerificationScaleInterval(e.target.value)}
                          placeholder="e.g. 0.010"
                          className="w-full pl-3 pr-10 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white font-mono"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 font-mono">
                          {unit}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Actual Scale Interval (d)</label>
                        {getConfidenceBadge('scale_interval')}
                      </div>
                      <div className="relative">
                        <input
                          id="inst-scale-interval"
                          type="number"
                          step="any"
                          required
                          value={scaleInterval}
                          onChange={(e) => setScaleInterval(e.target.value)}
                          placeholder="e.g. 0.005"
                          className="w-full pl-3 pr-10 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white font-mono"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 font-mono">
                          {unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Laboratory Identification & Inspection Notes
                  </label>
                  <textarea
                    id="inst-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter serial notes, calibration location, or physical inspection remarks..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 bg-white"
                  />
                </div>

                {/* Form Action Controls */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <Link
                    to="/app/instruments"
                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900"
                  >
                    Cancel
                  </Link>

                  <button
                    id="save-instrument-submit"
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded shadow-xs transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving Verified Record...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Confirm & Save Verified Instrument</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
