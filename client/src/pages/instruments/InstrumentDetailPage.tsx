import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  FileCheck2,
  Trash2,
  ZoomIn
} from 'lucide-react';
import { ImageViewerModal } from '../../components/ImageViewerModal';

export const InstrumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [files, setFiles] = useState<InstrumentFile[]>([]);
  const [ocrHistory, setOcrHistory] = useState<OcrResult[]>([]);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // File upload and viewer state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [activeModalFile, setActiveModalFile] = useState<InstrumentFile | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await InstrumentService.getById(id);
      setInstrument(data.instrument);
      setFiles(data.files);
      setOcrHistory(data.ocr_history);

      const historyData = await InstrumentService.getHistory(id);
      setTestHistory(historyData);
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

  const handleDeleteInstrument = async () => {
    if (!id) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await InstrumentService.delete(id);
      navigate('/app/instruments');
    } catch (err: any) {
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete instrument.');
    } finally {
      setIsDeleting(false);
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
          <button
            type="button"
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 bg-white hover:bg-red-50 border border-red-300 rounded shadow-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Instrument</span>
          </button>
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

        {/* Peripheral Configuration (Clauses 3.6.3 & 3.6.4) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5">
          <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">
            Peripheral & Indicating Devices (Clauses 3.6.3 & 3.6.4)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            <div>
              <span className="text-slate-500">Auxiliary Devices: </span>
              <span className="font-semibold text-slate-800 font-mono">
                {instrument.device_configuration?.auxiliary_indicating_devices || 'NO'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Remote Display: </span>
              <span className="font-semibold text-slate-800 font-mono">
                {instrument.device_configuration?.remote_display || 'NO'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Attached Printer: </span>
              <span className="font-semibold text-slate-800 font-mono">
                {instrument.device_configuration?.printer || 'NO'}
              </span>
            </div>
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

      {/* ------------------------------------------------------------------ */}
      {/* INSTRUMENT NAMEPLATE / LABEL (PHYSICAL EVIDENCE)                   */}
      {/* ------------------------------------------------------------------ */}
      {(() => {
        const nameplateFile = files.find(f => f.document_type === 'NAMEPLATE') || files.find(f => f.document_type === 'INSTRUMENT_PHOTO') || files[0];
        const otherFiles = files.filter(f => f.id !== nameplateFile?.id);
        const latestOcr = ocrHistory[0];

        return (
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  <FileCheck2 className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Instrument Nameplate / Label Physical Evidence
                    </h3>
                    {latestOcr && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        OCR: {latestOcr.ocr_status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Original manufacturer marking plate preserved for metrological traceability under OIML R-76.
                  </p>
                </div>
              </div>

              <div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Attach Additional Photo'}</span>
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

            {nameplateFile ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Visual Label Image Card */}
                <div className="lg:col-span-5 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-xs">
                  <div className="relative group aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden">
                    <img
                      src={InstrumentService.getFileViewUrl(instrument.id, nameplateFile.id)}
                      alt={nameplateFile.file_name}
                      className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setActiveModalFile(nameplateFile)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/95 text-slate-900 text-xs font-bold shadow-lg hover:bg-white transition-all transform hover:scale-105"
                      >
                        <ZoomIn className="w-4 h-4 text-blue-700" />
                        <span>Inspect Full Image</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-slate-300 text-xs flex items-center justify-between">
                    <div className="truncate pr-2">
                      <div className="font-bold text-white truncate text-xs">{nameplateFile.file_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {(nameplateFile.file_size / 1024).toFixed(1)} KB &bull; {new Date(nameplateFile.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModalFile(nameplateFile)}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] flex-shrink-0 transition-colors"
                    >
                      Enlarge
                    </button>
                  </div>
                </div>

                {/* Authoritative Values vs Visual Markings Comparison */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Verified Technical Baseline for Testing
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Parameter</th>
                            <th className="py-2 px-3">Verified Value</th>
                            <th className="py-2 px-3">Metrological Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          <tr>
                            <td className="py-2 px-3 font-medium text-slate-600 font-sans">Manufacturer / Model</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{instrument.manufacturer} - {instrument.model_number}</td>
                            <td className="py-2 px-3 text-[11px] text-slate-500 font-sans">Nameplate marking</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium text-slate-600 font-sans">Serial Number</td>
                            <td className="py-2 px-3 font-bold text-blue-700">{instrument.serial_number}</td>
                            <td className="py-2 px-3 text-[11px] text-slate-500 font-sans">Unique instrument identity</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium text-slate-600 font-sans">Accuracy Class</td>
                            <td className="py-2 px-3 font-bold text-slate-900">Class {instrument.accuracy_class}</td>
                            <td className="py-2 px-3 text-[11px] text-slate-500 font-sans">OIML R 76-1 Clause 3.2</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium text-slate-600 font-sans">Capacity (Max / Min)</td>
                            <td className="py-2 px-3 font-bold text-slate-900">Max {instrument.max_capacity} {instrument.unit} / Min {instrument.min_capacity} {instrument.unit}</td>
                            <td className="py-2 px-3 text-[11px] text-slate-500 font-sans">Weighing range</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium text-slate-600 font-sans">Intervals (e / d)</td>
                            <td className="py-2 px-3 font-bold text-slate-900">e = {instrument.verification_scale_interval} {instrument.unit} &bull; d = {instrument.scale_interval} {instrument.unit}</td>
                            <td className="py-2 px-3 text-[11px] text-slate-500 font-sans">Clause 3.4 verification interval</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                    <span className="font-bold">Authoritative Rule:</span> Technician verification of the physical label image is authoritative under legal metrology standards. Optical character recognition (OCR) provides assistive extraction; human verification establishes the official registered record.
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-700">No nameplate photograph attached</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Attach an instrument nameplate photo using the upload button above to preserve visual evidence for officer review.
                </p>
              </div>
            )}

            {/* Additional Attached Documents if any */}
            {otherFiles.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Additional Attached Photographs & Documents ({otherFiles.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {otherFiles.map((file) => {
                    const viewUrl = InstrumentService.getFileViewUrl(instrument.id, file.id);
                    return (
                      <div
                        key={file.id}
                        className="border border-slate-200 rounded-lg overflow-hidden group bg-slate-50 flex flex-col justify-between"
                      >
                        <div className="h-28 bg-slate-900 flex items-center justify-center overflow-hidden relative">
                          <img
                            src={viewUrl}
                            alt={file.file_name}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                          />
                          <button
                            type="button"
                            onClick={() => setActiveModalFile(file)}
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
              </div>
            )}
          </div>
        );
      })()}

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
                  Standard Testing
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

      {/* SECTION: INSTRUMENT TEST HISTORY */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Instrument Test & Verification History
              </h3>
              <p className="text-[11px] text-slate-500">
                Complete longitudinal legal-metrology record and certification timeline for this instrument.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-slate-500">
            Sessions: <strong>{testHistory.length}</strong>
          </span>
        </div>

        {testHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No test sessions recorded yet for this instrument.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Session Number</th>
                  <th className="py-2.5 px-3">Regulatory Mode</th>
                  <th className="py-2.5 px-3">Technician</th>
                  <th className="py-2.5 px-3">Officer</th>
                  <th className="py-2.5 px-3">Overall Result</th>
                  <th className="py-2.5 px-3">Workflow</th>
                  <th className="py-2.5 px-3">Report Number</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {testHistory.map((h: any) => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {h.test_date ? new Date(h.test_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-800">
                      {h.session_number}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {h.regulatory_mode}
                    </td>
                    <td className="py-3 px-3 text-slate-800">
                      {h.technician_name || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-800">
                      {h.officer_name || '—'}
                    </td>
                    <td className="py-3 px-3">
                      {h.overall_status === 'PASSED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono">
                          PASSED
                        </span>
                      ) : h.overall_status === 'FAILED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-300 font-mono">
                          FAILED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                          {h.overall_status || 'DRAFT'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 border border-slate-200 text-slate-700">
                        {h.workflow_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-purple-900">
                      {h.report_number || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/app/tests/${h.id}`}
                          className="px-2 py-1 text-xs font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-700 rounded transition-colors"
                        >
                          Workspace
                        </Link>
                        {h.public_verification_id && (
                          <a
                            href={`/public/report/${h.public_verification_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs font-semibold text-purple-700 hover:text-white bg-purple-50 hover:bg-purple-700 rounded transition-colors"
                          >
                            QR
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Instrument {instrument.serial_number}?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete instrument{' '}
              <strong className="text-slate-900">{instrument.manufacturer} {instrument.model_number} (SN: {instrument.serial_number})</strong>?
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 space-y-1">
              <div className="font-bold">Cascading Data Deletion:</div>
              <ul className="list-disc list-inside text-[11px] text-red-700">
                <li>All associated test sessions and technical test data</li>
                <li>All uploaded nameplate photos and OCR records</li>
                <li>All generated non-official artifacts</li>
              </ul>
              <div className="text-[11px] text-slate-500 pt-1">
                * Note: Approved official verification records cannot be deleted by technicians.
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-100 border border-red-300 rounded text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteInstrument}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded shadow-xs transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Entire Instrument'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Lightbox Viewer Modal for Nameplate and Documents */}
      {instrument && (
        <ImageViewerModal
          isOpen={!!activeModalFile}
          onClose={() => setActiveModalFile(null)}
          imageUrl={
            activeModalFile
              ? InstrumentService.getFileViewUrl(instrument.id, activeModalFile.id)
              : null
          }
          title={`Inspection: ${activeModalFile?.file_name || 'Instrument Image'}`}
          metadata={{
            fileName: activeModalFile?.file_name,
            fileSize: activeModalFile?.file_size,
            uploadDate: activeModalFile?.created_at,
            uploadedBy: activeModalFile?.uploader_name || activeModalFile?.uploaded_by,
            ocrStatus: ocrHistory[0]?.ocr_status
          }}
        />
      )}
    </div>
  );
};
