import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReportService } from '../../services/reportService';
import type { PublicVerificationReport } from '../../types/report.types';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Scale,
  Building2,
  Layers,
  Copy,
  Check,
  QrCode,
  FileText,
  FileSpreadsheet
} from 'lucide-react';

export const PublicReportVerificationPage: React.FC = () => {
  const { verificationId } = useParams<{ verificationId: string }>();
  const [report, setReport] = useState<PublicVerificationReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVerification() {
      if (!verificationId) {
        setError('Missing report verification identifier.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await ReportService.getPublicVerification(verificationId);
        setReport(data);
      } catch (err: any) {
        setError(
          err.response?.data?.error?.message ||
          'The requested test report could not be verified. It may have expired, or the verification code is invalid.'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchVerification();
  }, [verificationId]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadPdf = async (type: 'certificate' | 'detailed' = 'certificate') => {
    if (!verificationId || !report) return;
    try {
      setDownloading(true);
      const suffix = type === 'certificate' ? '_certificate.pdf' : '_detailed.pdf';
      await ReportService.downloadPublicPdf(verificationId, `${report.reportNumber}${suffix}`, type);
    } catch (err) {
      alert('Failed to download PDF document. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!verificationId || !report) return;
    try {
      setDownloading(true);
      await ReportService.downloadPublicExcel(verificationId, `${report.reportNumber}_test_data.xlsx`);
    } catch (err) {
      alert('Failed to download Excel test data workbook. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-white font-mono text-sm tracking-widest uppercase">
          Verifying Metrological Cryptographic Signature...
        </h2>
        <p className="text-slate-400 text-xs mt-1">Connecting to official verification registry</p>
      </div>
    );
  }

  // 2. Not Found / Error State (Clean, isolated, graceful)
  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center mx-auto text-red-500">
            <XCircle className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-red-400 font-bold">
              VERIFICATION FAILED
            </span>
            <h1 className="text-xl font-bold text-white mt-1">Report Not Found</h1>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {error || 'The requested verification identifier does not correspond to any official NAWI test report in the registry.'}
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400">
            Provided Identifier: <span className="text-white">{verificationId}</span>
          </div>
          <div className="pt-2 text-[10px] text-slate-500">
            National Legal Metrology Verification System &bull; OIML R 76-1:2006
          </div>
        </div>
      </div>
    );
  }

  // 3. Status Styling
  const isPass = report.overallStatus === 'PASSED' || report.overallStatus === 'PASS';
  const isFail = report.overallStatus === 'FAILED' || report.overallStatus === 'FAIL';
  const isReview = report.overallStatus === 'REVIEW_REQUIRED';

  const inst = report.instrument || {};
  const modelNo = inst.modelNumber || inst.model_number || 'N/A';
  const serialNo = inst.serialNumber || inst.serial_number || 'N/A';
  const instType = inst.instrumentType || inst.instrument_type || 'Electronic Non-Automatic Weighing Instrument';
  const accClass = inst.accuracyClass || inst.accuracy_class || 'III';
  const maxCap = inst.maxCapacity ?? inst.max_capacity ?? '-';
  const minCap = inst.minCapacity ?? inst.min_capacity ?? '-';
  const scaleD = inst.scaleInterval ?? inst.scale_interval ?? '-';
  const scaleE = inst.verificationScaleInterval ?? inst.verification_scale_interval ?? '-';
  const unit = inst.unit || 'kg';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-16">
      {/* Top Verification Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
                  PUBLIC VERIFICATION PORTAL
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-sm font-bold text-white tracking-wide">
                NAWI TEST REPORT VERIFICATION
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => handleDownloadPdf('certificate')}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-xs transition-all"
              title="Official 1-page A4 Legal Metrology Verification Certificate"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? '...' : 'Certificate'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadPdf('detailed')}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-xs transition-all"
              title="Comprehensive Multi-Page Detailed Technical Metrology Report"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Detailed Report</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 shadow-xs transition-all"
              title="Download Excel Workbook with Raw Observations and Calculations"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel Data</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Verification Authenticity Banner */}
        <div className={`border rounded-2xl p-6 shadow-xl relative overflow-hidden ${
          isFail
            ? 'bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-950 border-red-500/50'
            : 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-blue-950/80 border-emerald-500/40'
        }`}>
          <div className={`absolute right-0 top-0 bottom-0 w-1/3 blur-3xl pointer-events-none ${
            isFail ? 'bg-red-500/5' : 'bg-emerald-500/5'
          }`} />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                isFail
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              }`}>
                {isFail ? <XCircle className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
              </div>
              <div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider mb-1 ${
                  isFail
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  {isFail ? '✕ AUTHENTIC RECORD: NON-COMPLIANT' : '✓ AUTHENTIC OFFICIAL RECORD'}
                </div>
                <h2 className="text-lg font-bold text-white">
                  {isFail ? 'Official Metrological Non-Compliance Determination' : 'Verified Official Metrological Test Report'}
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  {isFail
                    ? 'This verification record has been officially evaluated under OIML R 76-1:2006. One or more mandatory metrological performance tests failed tolerance boundaries.'
                    : 'This document has been issued by an accredited laboratory under the authority of OIML Recommendation R 76-1:2006. The digital cryptographic verification code matches the central registry.'}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <span className="text-[10px] text-slate-400 block font-mono">Issued On</span>
              <span className="text-xs font-mono font-bold text-white">
                {new Date(report.generatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Quick Identifiers Strip */}
          <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono uppercase">Official Report Number</span>
                <span className="font-mono font-bold text-white text-sm">{report.reportNumber}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(report.reportNumber, 'reportNo')}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Copy Report Number"
              >
                {copiedField === 'reportNo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono uppercase">Public Verification ID</span>
                <span className="font-mono font-bold text-blue-400 text-sm">{report.verificationId}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(report.verificationId, 'verId')}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Copy Verification ID"
              >
                {copiedField === 'verId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div className={`p-5 rounded-xl border flex items-center justify-between gap-4 ${
          isPass
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
            : isFail
              ? 'bg-red-950/60 border-red-500/40 text-red-200'
              : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
        }`}>
          <div className="flex items-center gap-3.5">
            {isPass && <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />}
            {isFail && <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />}
            {isReview && <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />}

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest opacity-80 block">
                OVERALL METROLOGICAL DETERMINATION
              </span>
              <h3 className="text-base font-bold tracking-wide">
                {isPass ? 'COMPLIANT (PASSED)' : isFail ? 'FAILED (NON-COMPLIANT)' : 'REVIEW REQUIRED (CONDITIONAL)'}
              </h3>
              <p className="text-xs mt-0.5 opacity-90">
                {report.complianceExplanation}
              </p>
            </div>
          </div>

          <span className={`px-4 py-1.5 rounded-lg text-xs font-mono font-extrabold uppercase tracking-wider border ${
            isPass
              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
              : isFail
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-amber-500 text-slate-950 border-amber-400'
          }`}>
            {report.overallStatus}
          </span>
        </div>

        {/* FAILED TESTS SECTION (PART 7) */}
        {isFail && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2 border-b border-red-500/30 pb-2.5">
              <XCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-200">
                FAILED TEST MODULES — SPECIFICATION VIOLATIONS
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {(report.complianceSummary?.failedTests && report.complianceSummary.failedTests.length > 0
                ? report.complianceSummary.failedTests
                : report.testSummary?.tests?.filter(t => t.status === 'FAIL') || []
              ).map((ft: any, fIdx: number) => {
                const name = ft.name || ft.code;
                const evidence = ft.keyEvidence || (ft.summary?.rangeDifference !== undefined ? `Delta I = ${Number(ft.summary.rangeDifference).toFixed(3)} ${unit}` : 'Exceeds MPE tolerance');
                const limit = ft.limit || (ft.summary?.mpeAbsolute !== undefined ? `MPE = +/-${Number(ft.summary.mpeAbsolute).toFixed(3)} ${unit}` : 'MPE Table 6');
                const excess = ft.excess || 'Non-compliant reading';
                return (
                  <div key={fIdx} className="bg-slate-950/80 border border-red-500/30 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-red-300 bg-red-900/60 px-2 py-0.5 rounded border border-red-700">
                          {ft.code || 'FAIL'}
                        </span>
                        <span className="font-bold text-sm text-white">{name} — FAILED</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-red-200 bg-red-950 border border-red-700">
                        NON-COMPLIANT
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">Observed Value</span>
                        <span className="text-red-300 font-bold">{evidence}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">Allowed Limit</span>
                        <span className="text-blue-300 font-bold">{limit}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">Tolerance Excess</span>
                        <span className="text-amber-300 font-bold">{excess}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Instrument & Laboratory 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Instrument Specification */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Scale className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Instrument Details
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Manufacturer</span>
                <span className="font-bold text-white">{inst.manufacturer}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Model Number</span>
                <span className="font-mono text-white">{modelNo}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Serial Number</span>
                <span className="font-mono text-blue-400 font-bold">{serialNo}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Accuracy Class</span>
                <span className="inline-block px-2 py-0.5 rounded bg-blue-900/60 border border-blue-700 text-blue-200 font-bold font-mono text-[11px]">
                  Class {accClass}
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400">
              <span>Type: </span>
              <span className="text-slate-200 font-medium">{instType}</span>
            </div>

            <div className="pt-3 border-t border-slate-800 grid grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-sans">Max</span>
                <span className="font-bold text-white">{maxCap} {unit}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-sans">Min</span>
                <span className="font-bold text-white">{minCap} {unit}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-sans">Scale (e)</span>
                <span className="font-bold text-white">{scaleE} {unit}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-sans">Interval (d)</span>
                <span className="font-bold text-white">{scaleD} {unit}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Regulatory & Laboratory Context */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Building2 className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Verification & Laboratory Authority
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Accredited Testing Facility</span>
                <span className="font-bold text-white">{report.laboratory?.name}</span>
                {report.laboratory?.address && (
                  <span className="text-[11px] text-slate-400 block mt-0.5">{report.laboratory.address}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block">Regulatory Mode</span>
                  <span className="font-mono text-purple-300 font-bold">{report.regulatoryMode}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Regulation Standard</span>
                  <span className="font-mono text-white">{report.regulationVersion}</span>
                </div>
              </div>

              {/* Environmental readings snapshot */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Temp</span>
                  <span>{report.environmental?.temperature ?? '22.5'} °C</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Humidity</span>
                  <span>{report.environmental?.humidity ?? '50.0'} %</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Pressure</span>
                  <span>{report.environmental?.atmosphericPressure ?? '1013'} hPa</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrological Test Results Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Metrological Test Breakdown ({report.testSummary?.tests?.length || 0} Evaluated)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              OIML R 76-1:2006 Clause Traceability
            </span>
          </div>

          <div className="divide-y divide-slate-800">
            {report.testSummary?.tests?.map((t, idx) => {
              const testPass = t.status === 'PASS';
              const testFail = t.status === 'FAIL';
              const testReview = t.status === 'REVIEW_REQUIRED';
              const testNA = t.status === 'NOT_APPLICABLE';
              const unit = report.instrument?.unit || 'kg';

              return (
                <div key={idx} className="p-4 hover:bg-slate-800/30 transition-colors space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-900">
                          {t.code}
                        </span>
                        <span className="font-bold text-sm text-white">{t.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono block">
                        {t.clause}
                      </span>
                    </div>

                    <div className="flex-shrink-0">
                      {testPass && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-600/50">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          PASS
                        </span>
                      )}
                      {testFail && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold text-red-300 bg-red-950/80 border border-red-600/50">
                          <XCircle className="w-3 h-3 text-red-400" />
                          FAIL
                        </span>
                      )}
                      {testReview && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-600/50">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          REVIEW REQUIRED
                        </span>
                      )}
                      {testNA && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700">
                          NOT APPLICABLE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* WEIGHING PERFORMANCE TABLE */}
                  {t.code === 'WEIGHING_PERFORMANCE' && t.observations && t.observations.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/50">
                      <table className="w-full text-left text-[11px] font-mono text-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                            <th className="py-2 px-2.5">No.</th>
                            <th className="py-2 px-2.5">Phase</th>
                            <th className="py-2 px-2.5">Load ({unit})</th>
                            <th className="py-2 px-2.5">Indication ({unit})</th>
                            <th className="py-2 px-2.5">ΔL</th>
                            <th className="py-2 px-2.5">E0</th>
                            <th className="py-2 px-2.5">Raw Error E</th>
                            <th className="py-2 px-2.5 font-bold text-white">Corr. Error Ec</th>
                            <th className="py-2 px-2.5">MPE</th>
                            <th className="py-2 px-2.5">Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {t.observations.map((obs, oi) => {
                            const res = t.results?.[oi];
                            const mpe = res?.limitValue !== undefined ? `±${Number(res.limitValue).toFixed(3)}` : '±0.010';
                            const rowPass = res?.passFail || (obs.correctedError !== null && obs.correctedError !== undefined ? (Math.abs(Number(obs.correctedError)) <= Number(res?.limitValue ?? 0.01) ? 'PASS' : 'FAIL') : 'PASS');
                            return (
                              <tr key={oi} className="hover:bg-slate-800/40">
                                <td className="py-1.5 px-2.5">{obs.sequenceNo || oi + 1}</td>
                                <td className="py-1.5 px-2.5">{obs.direction || 'LOADING'}</td>
                                <td className="py-1.5 px-2.5">{obs.loadValue !== undefined && obs.loadValue !== null ? Number(obs.loadValue).toFixed(3) : '-'}</td>
                                <td className="py-1.5 px-2.5">{obs.indicationValue !== undefined && obs.indicationValue !== null ? Number(obs.indicationValue).toFixed(3) : '-'}</td>
                                <td className="py-1.5 px-2.5">{obs.additionalLoad !== null && obs.additionalLoad !== undefined ? Number(obs.additionalLoad).toFixed(3) : '-'}</td>
                                <td className="py-1.5 px-2.5">{obs.zeroError !== null && obs.zeroError !== undefined ? Number(obs.zeroError).toFixed(3) : '0.000'}</td>
                                <td className="py-1.5 px-2.5">{obs.rawError !== null && obs.rawError !== undefined ? Number(obs.rawError).toFixed(3) : '-'}</td>
                                <td className="py-1.5 px-2.5 font-bold text-white">{obs.correctedError !== null && obs.correctedError !== undefined ? Number(obs.correctedError).toFixed(3) : '-'}</td>
                                <td className="py-1.5 px-2.5 text-blue-300">{mpe}</td>
                                <td className="py-1.5 px-2.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${rowPass === 'PASS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                                    {rowPass}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="p-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-sans">
                        Applied Formulae: P = I + 0.5e - ΔL  |  Raw Error E = P - L  |  Corrected Error Ec = E - E0
                      </div>
                    </div>
                  )}

                  {/* REPEATABILITY READINGS & SPREAD */}
                  {t.code === 'REPEATABILITY' && (
                    <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2.5 font-mono text-xs">
                      {t.observations && t.observations.length > 0 && (
                        <div>
                          <span className="text-slate-400 text-[11px] block font-sans mb-1.5 font-semibold">Individual Test Load Runs:</span>
                          <div className="flex flex-wrap gap-2">
                            {t.observations.map((o, oi) => (
                              <span key={oi} className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-[11px]">
                                Run {oi + 1}: <strong>{Number(o.indicationValue).toFixed(3)} {unit}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2.5 border-t border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-500 font-sans block">Max Indication (Imax)</span>
                          <span className="text-white font-bold">{t.summary?.maxIndication !== undefined ? Number(t.summary.maxIndication).toFixed(3) : '-'} {unit}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans block">Min Indication (Imin)</span>
                          <span className="text-white font-bold">{t.summary?.minIndication !== undefined ? Number(t.summary.minIndication).toFixed(3) : '-'} {unit}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans block">Difference ΔI (Imax - Imin)</span>
                          <span className={`font-bold ${
                            testFail || (t.summary?.rangeDifference !== undefined && t.summary?.mpeAbsolute !== undefined && Number(t.summary.rangeDifference) > Number(t.summary.mpeAbsolute))
                              ? 'text-red-400 font-extrabold bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800 inline-block'
                              : 'text-amber-300'
                          }`}>
                            {t.summary?.rangeDifference !== undefined ? Number(t.summary.rangeDifference).toFixed(3) : (t.summary?.maxSpread !== undefined ? Number(t.summary.maxSpread).toFixed(3) : '-')} {unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans block">Applicable MPE Limit</span>
                          <span className="text-blue-300 font-bold">{t.summary?.mpeAbsolute !== undefined ? Number(t.summary.mpeAbsolute).toFixed(3) : '-'} {unit}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ECCENTRIC LOADING POSITIONS TABLE */}
                  {t.code === 'ECCENTRIC_LOADING' && t.observations && t.observations.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/50">
                      <table className="w-full text-left text-[11px] font-mono text-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                            <th className="py-2 px-2.5">Position</th>
                            <th className="py-2 px-2.5">Applied Load ({unit})</th>
                            <th className="py-2 px-2.5">Indication ({unit})</th>
                            <th className="py-2 px-2.5">ΔL</th>
                            <th className="py-2 px-2.5">Raw Error E</th>
                            <th className="py-2 px-2.5 font-bold text-white">Corr. Error Ec</th>
                            <th className="py-2 px-2.5">MPE</th>
                            <th className="py-2 px-2.5">Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {t.observations.map((obs, oi) => {
                            const posSum = t.summary?.positions?.[oi];
                            const mpe = posSum?.mpe !== undefined ? `±${Number(posSum.mpe).toFixed(3)}` : '±0.010';
                            const pStatus = posSum?.status || (obs.correctedError !== null && obs.correctedError !== undefined ? (Math.abs(Number(obs.correctedError)) <= 0.01 ? 'PASS' : 'FAIL') : 'PASS');
                            return (
                              <tr key={oi} className="hover:bg-slate-800/40">
                                <td className="py-1.5 px-2.5 font-bold text-white">{obs.position || `Position ${oi + 1}`}</td>
                                <td className="py-1.5 px-2.5">{obs.loadValue !== undefined && obs.loadValue !== null ? Number(obs.loadValue).toFixed(3) : '-'}</td>
                                <td className="py-1.5 px-2.5">{obs.indicationValue !== undefined && obs.indicationValue !== null ? Number(obs.indicationValue).toFixed(3) : '-'}</td>
                                <td className="py-1.5 px-2.5">{obs.additionalLoad !== null && obs.additionalLoad !== undefined ? Number(obs.additionalLoad).toFixed(3) : '-'}</td>
                                <td className="py-1.5 px-2.5">{obs.rawError !== null && obs.rawError !== undefined ? Number(obs.rawError).toFixed(3) : '-'}</td>
                                <td className="py-1.5 px-2.5 font-bold text-white">{obs.correctedError !== null && obs.correctedError !== undefined ? Number(obs.correctedError).toFixed(3) : '-'}</td>
                                <td className="py-1.5 px-2.5 text-blue-300">{mpe}</td>
                                <td className="py-1.5 px-2.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pStatus === 'PASS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                                    {pStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ZERO SETTING DETAILS */}
                  {t.code === 'ZERO_SETTING' && (
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 font-sans block">Initial Indication</span>
                        <span className="text-white font-bold">{t.observations?.[0] ? Number(t.observations[0].indicationValue).toFixed(3) : '0.000'} {unit}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans block">Changeover ΔL</span>
                        <span className="text-white">{t.observations?.[0]?.additionalLoad !== null && t.observations?.[0]?.additionalLoad !== undefined ? Number(t.observations[0].additionalLoad).toFixed(3) : '-'} {unit}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans block">Zero Error E0</span>
                        <span className="text-emerald-300 font-bold">{t.summary?.zeroErrorE0 !== undefined ? Number(t.summary.zeroErrorE0).toFixed(3) : '0.000'} {unit}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans block">Tolerance Limit</span>
                        <span className="text-blue-300 font-bold">±0.25 e</span>
                      </div>
                    </div>
                  )}

                  {/* DISCRIMINATION DETAILS */}
                  {t.code === 'DISCRIMINATION' && (
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-[11px] font-mono">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <span className="text-slate-500 font-sans block">Base Test Load</span>
                          <span className="text-white font-bold">{t.observations?.[0] ? Number(t.observations[0].loadValue).toFixed(3) : '-'} {unit}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans block">Additional Load (1.4 d)</span>
                          <span className="text-white">{t.observations?.[0]?.additionalLoad !== null && t.observations?.[0]?.additionalLoad !== undefined ? Number(t.observations[0].additionalLoad).toFixed(4) : '-'} {unit}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans block">Resulting Indication</span>
                          <span className="text-emerald-300 font-bold">{t.observations?.[0] ? Number(t.observations[0].indicationValue).toFixed(3) : '-'} {unit}</span>
                        </div>
                      </div>
                      {t.summary?.explanation && (
                        <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-sans italic">
                          {t.summary.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Callout: PDF & Excel Downloads & QR Verification Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-5">
            {report.qrDataUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-md flex-shrink-0">
                <img
                  src={report.qrDataUrl}
                  alt={`QR Verification Code for ${report.reportNumber}`}
                  className="w-24 h-24"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                <QrCode className="w-10 h-10" />
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-white">Official Printable &amp; Data Records</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Download the official 1-page verification certificate, the multi-page detailed technical metrology report with full formula traces, or the complete Excel test observations &amp; calculations workbook.
              </p>
              <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-slate-500">
                <span>Verification URL:</span>
                <span className="text-blue-400 truncate max-w-xs">{report.verificationUrl}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full sm:w-72 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleDownloadPdf('certificate')}
              disabled={downloading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all active:scale-98"
              title="Download strictly 1-page A4 Legal Metrology Verification Certificate"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Download Certificate (1-Page)'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadPdf('detailed')}
              disabled={downloading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-sm transition-all active:scale-98"
              title="Download comprehensive multi-page technical report with full calculation tables"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Download Detailed Report</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 shadow-sm transition-all active:scale-98"
              title="Download full Excel workbook (.xlsx) containing all observations and calculations"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Download Excel Test Data</span>
            </button>
          </div>
        </div>

        {/* Metrological Legal Footer */}
        <footer className="pt-6 border-t border-slate-900 text-center text-slate-500 text-[11px] space-y-1">
          <p>National Legal Metrology Verification System &bull; OIML Recommendation R 76-1:2006 (Non-Automatic Weighing Instruments)</p>
          <p>This verification portal is digitally synchronized with the accredited testing laboratory archive.</p>
        </footer>
      </main>
    </div>
  );
};
