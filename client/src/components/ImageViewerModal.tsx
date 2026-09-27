import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Eye, CheckCircle2 } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    uploadDate?: string;
    uploadedBy?: string;
    ocrStatus?: string;
  };
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Instrument Nameplate / Label Inspection',
  metadata
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Reset zoom on open
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
    }
  }, [isOpen, imageUrl]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex flex-col justify-between p-4 sm:p-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-white shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate">{title}</h3>
              {metadata?.ocrStatus && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-700/60 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  OCR: {metadata.ocrStatus}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
              {metadata?.fileName && <span>{metadata.fileName}</span>}
              {metadata?.fileSize && (
                <span>&bull; {(metadata.fileSize / 1024).toFixed(1)} KB</span>
              )}
              {metadata?.uploadDate && (
                <span>&bull; {new Date(metadata.uploadDate).toLocaleDateString()}</span>
              )}
              {metadata?.uploadedBy && (
                <span>&bull; Uploaded by: {metadata.uploadedBy}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-slate-300">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-1.5 hover:bg-slate-700 rounded hover:text-white transition-colors disabled:opacity-30"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-semibold min-w-[50px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="p-1.5 hover:bg-slate-700 rounded hover:text-white transition-colors disabled:opacity-30"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-slate-700 rounded hover:text-white transition-colors ml-1 border-l border-slate-700"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={metadata?.fileName || 'instrument-label-image'}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Open / Download Full Image"
          >
            <Download className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-red-900/60 rounded-lg border border-slate-700 hover:border-red-700 text-slate-300 hover:text-red-200 transition-colors"
            title="Close Preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div className="flex-1 overflow-auto my-3 flex items-center justify-center rounded-xl bg-slate-950/60 border border-slate-900/80 p-2">
        <div
          className="transition-transform duration-150 ease-out origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl border border-slate-800"
          />
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="text-center text-[11px] text-slate-400 font-mono">
        OIML R 76-1:2006 Physical Nameplate Evidence &bull; Use zoom controls or drag to inspect markings &bull; Press ESC to close
      </div>
    </div>
  );
};
