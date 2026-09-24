import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { InstrumentService } from '../../services/instrumentService';
import type { Instrument, InstrumentFile, OcrResult } from '../../types';
import {
  Scale,
  ArrowLeft,
  Edit2,
  Calendar,
  Building2,
  FileText,
  FlaskConical,
  Upload,
  AlertCircle,
  Eye,
  CheckCircle2,
  FileCheck2
} from 'lucide-react';

export const InstrumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [files, setFiles] = useState<InstrumentFile[]>([]);
  const [ocrHistory, setOcrHistory] = useState<OcrResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // File upload state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await InstrumentService.getById(id);
      setInstrument(data.instrument);
      setFiles(data.files);
      setOcrHistory(data.ocr_history);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load instrument details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      await InstrumentService.uploadFile(id, file, 'INSTRUMENT_PHOTO');
      await fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-blue-700 rounded-full animate-spin" />
        <span className="text-xs font-medium text-slate-600">Retrieving instrument record...</span>
      </div>
    );
  }

  if (error || !instrument) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white border border-red-200 rounded-lg shadow-xs text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900">Instrument Record Unavailable</h3>
        <p className="text-xs text-slate-600">{error || 'Instrument not found.'}</p>
        <Link
          to="/app/instruments"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Registry</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/app/instruments"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-800">
                {instrument.serial_number}
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-xs text-slate-500">{instrument.instrument_type}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {instrument.manufacturer} {instrument.model_number}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={`/app/tests/new?instrumentId=${instrument.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Initiate R-76 Testing</span>
          </Link>
          <Link
            to={`/app/instruments/${instrument.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-xs transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Specifications</span>
          </Link>
        </div>
      </div>

      {/* Main Specifications Overview Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Verified Technical Parameters (OIML R-76)
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            {instrument.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Accuracy Class
            </span>
            <span className="text-sm font-bold text-blue-800 font-mono">
              Class {instrument.accuracy_class}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Capacity Range (Min - Max)
            </span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {instrument.min_capacity} to {instrument.max_capacity} {instrument.unit}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Verification Interval (e)
            </span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              e = {instrument.verification_scale_interval} {instrument.unit}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Scale Interval (d)
            </span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              d = {instrument.scale_interval} {instrument.unit}
            </span>
          </div>
        </div>

        {/* Extended metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs border-t border-slate-100">
          <div>
            <span className="text-slate-400 block">Accredited Laboratory:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {instrument.laboratory_name || 'Central Legal Metrology Testing Laboratory'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Registered By:</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {instrument.creator_name || 'Authorized Operator'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Registration Timestamp:</span>
            <span className="font-mono text-slate-700 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(instrument.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        {instrument.notes && (
          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-1">Inspection & Serial Notes:</span>
            <p className="text-slate-600">{instrument.notes}</p>
          </div>
        )}
      </div>

      {/* Document & Photograph Gallery */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Instrument Photographs & Attached Documents
              </h3>
              <p className="text-[11px] text-slate-500">
                OIML R-76 mandated nameplate photographs and verification documents.
              </p>
            </div>
          </div>

          <div>
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : 'Attach Photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No photographs or documents currently attached to this instrument.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {files.map((file) => {
              const viewUrl = InstrumentService.getFileViewUrl(instrument.id, file.id);
              return (
                <div
                  key={file.id}
                  className="border border-slate-200 rounded-lg overflow-hidden group bg-slate-50 flex flex-col justify-between"
                >
                  <div className="h-32 bg-slate-900 flex items-center justify-center overflow-hidden relative">
                    <img
                      src={viewUrl}
                      alt={file.file_name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewImage(viewUrl)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs gap-1 transition-opacity"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-white">
                    <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                      {file.document_type}
                    </div>
                    <div className="text-xs font-medium text-slate-800 truncate" title={file.file_name}>
                      {file.file_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {(file.file_size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OCR Audit Trail Section */}
      {ocrHistory.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileCheck2 className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                OCR Traceability & Verification Audit
              </h3>
              <p className="text-[11px] text-slate-500">
                Preserved optical character recognition artifacts and human verification boundary.
              </p>
            </div>
          </div>

          {ocrHistory.map((item) => (
            <div key={item.id} className="p-4 bg-slate-50 rounded border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Status: <span className="font-mono text-emerald-800">{item.ocr_status}</span>
                </span>
                <span className="text-slate-400 font-mono">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-600 block mb-1">
                  Original Raw OCR Captured:
                </span>
                <pre className="p-2.5 bg-slate-950 text-emerald-400 rounded text-[11px] font-mono whitespace-pre-wrap border border-slate-800">
                  {item.raw_text}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Testing Section (Phase 3 Active) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-700 border border-blue-200">
              <FlaskConical className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Phase 3 Active
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  OIML R 76-1:2006 Testing & Calculation Engine
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Metrological Calibration & Legal Metrology Testing
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                This instrument is pre-configured with Max ({instrument.max_capacity} {instrument.unit}), Min ({instrument.min_capacity} {instrument.unit}), verification interval e ({instrument.verification_scale_interval} {instrument.unit}), and scale interval d ({instrument.scale_interval} {instrument.unit}).
                Launch a standardized test session to perform:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs text-slate-700 font-mono">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  1. Weighing Performance
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  2. Repeatability Test
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  3. Eccentric Loading
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  4. Discrimination (1.4d)
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0">
            <Link
              to={`/app/tests/new?instrumentId=${instrument.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Start Test Session</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[90vh] max-w-full rounded object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 font-bold flex items-center justify-center shadow-lg"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
