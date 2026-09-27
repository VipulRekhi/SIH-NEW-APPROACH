import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { TestSessionService } from '../../../services/testSessionService';
import { ReportService } from '../../../services/reportService';
import type { TestSession, TestSessionTest } from '../../../types/test.types';
import type { Report } from '../../../types/report.types';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Scale,
  MinusCircle,
  FileText,
  Download,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  FileSpreadsheet,
  Send,
  CornerUpLeft,
  XOctagon,
  Award,
  Lock,
  UserCheck,
  ZoomIn,
  FileCheck2
} from 'lucide-react';
import { InstrumentService } from '../../../services/instrumentService';
import { ImageViewerModal } from '../../../components/ImageViewerModal';
import type { Instrument, InstrumentFile, OcrResult } from '../../../types';

interface Props {
  session: TestSession;
  tests: TestSessionTest[];
  onUpdated: () => void;
}

export const TestSessionReview: React.FC<Props> = ({ session, tests, onUpdated }) => {
  const { user } = useAuth();
  const role = user?.role_name || 'technician';

  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Workflow state action loaders
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [startingReview, setStartingReview] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [returning, setReturning] = useState<boolean>(false);
  const [rejecting, setRejecting] = useState<boolean>(false);

  // Modals for approve, return and reject
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [returnComments, setReturnComments] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Report & Document State
  const [report, setReport] = useState<Report | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(true);
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Instrument Physical Evidence & Nameplate State
  const [instrumentData, setInstrumentData] = useState<{
    instrument: Instrument;
    files: InstrumentFile[];
    ocr_history: OcrResult[];
  } | null>(null);
  const [loadingInstrument, setLoadingInstrument] = useState<boolean>(true);
  const [activeModalFile, setActiveModalFile] = useState<InstrumentFile | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadInstrumentEvidence() {
      if (!session.instrument_id) return;
      try {
        setLoadingInstrument(true);
        const data = await InstrumentService.getById(session.instrument_id);
        if (isMounted) {
          setInstrumentData(data);
        }
      } catch (err) {
        console.error('Failed to load instrument evidence in review:', err);
      } finally {
        if (isMounted) {
          setLoadingInstrument(false);
        }
      }
    }

    loadInstrumentEvidence();
    return () => {
      isMounted = false;
    };
  }, [session.instrument_id]);

  useEffect(() => {
    async function loadExistingReport() {
      try {
        setLoadingReport(true);
        const existing = await ReportService.getReportBySession(session.id);
        setReport(existing);
      } catch (err) {
        console.error('Failed to load existing session report:', err);
      } finally {
        setLoadingReport(false);
      }
    }

    loadExistingReport();
  }, [session.id]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError(null);
    setActionSuccess(null);
    try {
      await TestSessionService.evaluateSession(session.id);
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to evaluate overall session status.');
    } finally {
      setEvaluating(false);
    }
  };

  // Technician: Submit for Review
  const handleSubmitForReview = async () => {
    setSubmitting(true);
    setError(null);
    setActionSuccess(null);
    try {
      await TestSessionService.submitForReview(session.id);
      setActionSuccess('Test session submitted for officer review. Observations are now locked.');
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to submit test session for review.');
    } finally {
      setSubmitting(false);
    }
  };

  // Officer: Start Review
  const handleStartReview = async () => {
    setStartingReview(true);
    setError(null);
    setActionSuccess(null);
    try {
      await TestSessionService.startReview(session.id);
      setActionSuccess('Session marked as Under Review.');
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to start review.');
    } finally {
      setStartingReview(false);
    }
  };

  // Officer: Return for Correction
  const handleConfirmReturn = async () => {
    if (!returnComments.trim()) {
      setError('Please provide comments explaining what the technician must correct.');
      return;
    }
    setReturning(true);
    setError(null);
    try {
      await TestSessionService.returnForCorrection(session.id, returnComments);
      setShowReturnModal(false);
      setReturnComments('');
      setActionSuccess('Session successfully returned to technician for correction.');
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to return session.');
    } finally {
      setReturning(false);
    }
  };

  // Officer: Reject Session
  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejecting this test session.');
      return;
    }
    setRejecting(true);
    setError(null);
    try {
      await TestSessionService.rejectSession(session.id, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
      setActionSuccess('Session marked as Rejected. Official certificate cannot be issued.');
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reject session.');
    } finally {
      setRejecting(false);
    }
  };

  // Officer: Approve & Generate Report
  const handleApproveSession = async () => {
    setApproving(true);
    setError(null);
    setActionSuccess(null);
    try {
      await TestSessionService.approveSession(session.id, 'Metrologically verified compliant with OIML R 76-1:2006.');
      setActionSuccess('Test session approved! Compiling official report and certificate...');
      onUpdated();

      // Automatically generate official report after approval
      const generated = await ReportService.generateReport(session.id, true);
      setReport(generated);
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to approve test session.');
    } finally {
      setApproving(false);
    }
  };

  const handleGenerateReport = async (force: boolean = false) => {
    setGeneratingReport(true);
    setError(null);
    setActionSuccess(null);
    try {
      const generated = await ReportService.generateReport(session.id, force);
      setReport(generated);
      setActionSuccess('Official report and certificate generated successfully.');
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate official test report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleViewPdf = async (type: 'certificate' | 'detailed' = 'certificate') => {
    if (!report) return;
    try {
      setDownloadingPdf(true);
      await ReportService.viewPdf(report.id, type);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to view report PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPdf = async (type: 'certificate' | 'detailed' = 'certificate') => {
    if (!report) return;
    try {
      setDownloadingPdf(true);
      const suffix = type === 'certificate' ? '_certificate.pdf' : '_detailed.pdf';
      await ReportService.downloadPdf(report.id, `${report.report_number}${suffix}`, type);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to download report PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!report) return;
    try {
      setDownloadingPdf(true);
      await ReportService.downloadExcel(report.id, `${report.report_number}_test_data.xlsx`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to download Excel test data workbook.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopyLink = () => {
    if (!report?.verification_url) return;
    navigator.clipboard.writeText(report.verification_url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Strict Compliance & Approval Safety Checks
  const failedMandatoryTests = tests.filter(
    (t) => t.applicability_status !== 'NOT_APPLICABLE' && t.status === 'FAIL'
  );
  const reviewRequiredTests = tests.filter(
    (t) => t.applicability_status !== 'NOT_APPLICABLE' && t.status === 'REVIEW_REQUIRED'
  );
  const incompleteMandatoryTests = tests.filter(
    (t) =>
      t.applicability_status !== 'NOT_APPLICABLE' &&
      ['DRAFT', 'IN_PROGRESS', 'INCOMPLETE', 'PENDING'].includes(t.status)
  );

  const canApprove =
    session.status === 'PASSED' &&
    failedMandatoryTests.length === 0 &&
    reviewRequiredTests.length === 0 &&
    incompleteMandatoryTests.length === 0;

  const approvalBlockReason = (() => {
    if (failedMandatoryTests.length > 0) {
      return `Cannot approve this test session because ${failedMandatoryTests.map(t => t.name).join(', ')} is FAILED.`;
    }
    if (reviewRequiredTests.length > 0) {
      return `Cannot approve this test session because ${reviewRequiredTests.map(t => t.name).join(', ')} requires qualitative review.`;
    }
    if (incompleteMandatoryTests.length > 0) {
      return `Cannot approve this test session because ${incompleteMandatoryTests.map(t => t.name).join(', ')} is incomplete.`;
    }
    if (session.status !== 'PASSED') {
      return `Cannot approve test session with status: ${session.status}. Authoritative evaluation must evaluate to PASSED.`;
    }
    return null;
  })();

  const workflowStatus = session.workflow_status || 'DRAFT';

  return (
    <div className="space-y-6">
      {/* Messages */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* WORKFLOW STATUS BANNER                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 mt-0.5">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Test Session Workflow State:
                </span>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-300 uppercase">
                  {workflowStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                Session {session.session_number} &bull; Mode: {session.regulatory_mode}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Technician: <strong>{session.technician_name || 'Assigned Technician'}</strong>
                {session.reviewer_name && (
                  <span> &bull; Reviewer: <strong>{session.reviewer_name}</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* Overall Calculated Status Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500">Engine Result:</span>
            {session.status === 'PASSED' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                PASSED
              </span>
            ) : session.status === 'FAILED' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300 font-mono">
                <XCircle className="w-4 h-4 text-red-600" />
                FAILED
              </span>
            ) : session.status === 'REVIEW_REQUIRED' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 font-mono">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                REVIEW REQ
              </span>
            ) : (
              <span className="px-3 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 font-mono">
                {session.status}
              </span>
            )}
          </div>
        </div>

        {/* Returned comments notice */}
        {workflowStatus === 'RETURNED_FOR_CORRECTION' && session.reviewer_comments && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
            <CornerUpLeft className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Officer Return Instructions:</div>
              <div className="mt-0.5 text-amber-800">{session.reviewer_comments}</div>
              <div className="text-[11px] text-amber-700 mt-1 font-sans">
                Please edit observations in the relevant test tabs above, re-calculate, and resubmit for officer review.
              </div>
            </div>
          </div>
        )}

        {/* Rejection notice */}
        {workflowStatus === 'REJECTED' && session.rejection_reason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2.5 text-xs text-red-900">
            <XOctagon className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Session Rejected:</div>
              <div className="mt-0.5 text-red-800">{session.rejection_reason}</div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ROLE ACTION CONTROLS                                               */}
      {/* ------------------------------------------------------------------ */}

      {/* 1. TECHNICIAN ACTIONS */}
      {role === 'technician' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Technician Workflow Action
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              PRAMOD PATIL &bull; TECHNICIAN
            </span>
          </div>

          {(workflowStatus === 'DRAFT' || workflowStatus === 'RETURNED_FOR_CORRECTION') ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h5 className="text-xs font-bold text-slate-800">
                  Ready to Submit Test Session for Officer Review
                </h5>
                <p className="text-xs text-slate-600 mt-0.5">
                  Once submitted, observations will be locked against silent modification while the officer reviews technical compliance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEvaluate}
                  disabled={evaluating}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded transition-colors"
                >
                  <Play className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
                  <span>Re-evaluate</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit for Officer Review'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5 text-xs text-slate-600">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>
                This session has been submitted to the officer (Status: <strong>{workflowStatus}</strong>). Observations are locked. Official report and certificate generation is reserved for the Officer workflow.
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. OFFICER ACTIONS */}
      {role === 'officer' && (
        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-xs space-y-4 bg-amber-50/20">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Officer Metrological Verification & Approval Gateway
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              ANAND DESHPANDE &bull; OFFICER
            </span>
          </div>

          {/* Safety Gate Warning if not approvable */}
          {!canApprove && (workflowStatus === 'SUBMITTED_FOR_REVIEW' || workflowStatus === 'UNDER_REVIEW') && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold">Metrological Safety Gate Active: Approval Disabled</div>
                <div className="mt-0.5 text-red-800">{approvalBlockReason}</div>
                <div className="text-[11px] text-red-700 mt-1">
                  You can Return this session to the technician for correction or Reject it.
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons for Officer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              {workflowStatus === 'SUBMITTED_FOR_REVIEW' && (
                <button
                  type="button"
                  onClick={handleStartReview}
                  disabled={startingReview}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Start Review</span>
                </button>
              )}

              {(workflowStatus === 'SUBMITTED_FOR_REVIEW' || workflowStatus === 'UNDER_REVIEW') && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-800 bg-white hover:bg-amber-50 border border-amber-300 rounded transition-colors shadow-xs"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5 text-amber-700" />
                    <span>Return for Correction</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-800 bg-white hover:bg-red-50 border border-red-300 rounded transition-colors shadow-xs"
                  >
                    <XOctagon className="w-3.5 h-3.5 text-red-700" />
                    <span>Reject Test</span>
                  </button>
                </>
              )}
            </div>

            {/* Final Approve Button */}
            {(workflowStatus === 'SUBMITTED_FOR_REVIEW' || workflowStatus === 'UNDER_REVIEW') && (
              <button
                type="button"
                onClick={() => setShowApproveModal(true)}
                disabled={!canApprove || approving}
                className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all ${
                  canApprove && !approving
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                }`}
                title={approvalBlockReason || 'Approve session and compile official report'}
              >
                <Award className="w-4 h-4" />
                <span>{approving ? 'Verifying & Approving...' : 'Approve & Issue Report'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. ADMIN INFO NOTICE */}
      {role === 'admin' && (
        <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-xs flex items-center justify-between text-xs text-purple-900 bg-purple-50/30">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>
              Administrator View: You may inspect technical evidence and audit history. Metrological approval authority is reserved for legal metrology Officers.
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
            RAKESH SHARMA &bull; ADMIN
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* OFFICIAL REPORT & CERTIFICATE CARD (After Approval Only)           */}
      {/* ------------------------------------------------------------------ */}
      {!(workflowStatus === 'APPROVED' || workflowStatus === 'OFFICIAL_REPORT_GENERATED') ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Official Verification Artifacts Locked (Pending Officer Approval)
          </h4>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Official 1-Page Certificate PDF, Detailed Technical Report, 12-sheet Excel Workbook, and Public QR Verification URL are strictly locked. They will become available only after formal approval by an authorized Legal Metrology Officer.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Official Legal Metrology Documents & QR Authentication
                </h3>
                <p className="text-xs text-slate-500">
                  OIML R 76-1:2006 certificate and report issued by authorized officer.
                </p>
              </div>
            </div>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              OFFICIAL RECORD
            </span>
          </div>

          {/* Technician Approval Notification Banner */}
          {role === 'technician' && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Verification Approved</span>
              </div>
              <p className="text-xs text-emerald-800">
                Your NAWI test session <strong>{session.session_number}</strong> has been officially approved by Officer <strong>{session.reviewer_name || 'Anand Deshpande'}</strong> on {session.reviewed_at ? new Date(session.reviewed_at).toLocaleDateString() : 'Official Record Date'}. Official verification artifacts are unlocked below.
              </p>
            </div>
          )}

          {loadingReport ? (
            <div className="py-6 text-center text-xs text-slate-500">Loading official report record...</div>
          ) : report ? (
            <div className={`border rounded-xl p-5 space-y-4 ${
              report.overall_status === 'FAILED'
                ? 'bg-gradient-to-r from-red-50/80 via-white to-slate-50 border-red-200'
                : 'bg-gradient-to-r from-blue-50/70 via-white to-slate-50 border-blue-200'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                    report.overall_status === 'FAILED'
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  }`}>
                    {report.overall_status === 'FAILED' ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider mb-1 border ${
                      report.overall_status === 'FAILED'
                        ? 'bg-red-100/90 border-red-200 text-red-800'
                        : 'bg-emerald-100/80 border-emerald-200 text-emerald-800'
                    }`}>
                      {report.overall_status === 'FAILED' ? '✕ OFFICIAL REPORT: FAILED (NON-COMPLIANT)' : '✓ OFFICIAL REPORT ISSUED'}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Report {report.report_number}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Assigned QR Verification ID:{' '}
                      <span className="font-mono font-bold text-blue-700">{report.public_verification_id}</span>
                    </p>
                  </div>
                </div>

                {/* View / Download Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewPdf('certificate')}
                    disabled={downloadingPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-xs transition-colors"
                    title="View 1-page official verification certificate in new tab"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Certificate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf('certificate')}
                    disabled={downloadingPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors"
                    title="Download 1-page official verification certificate PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Certificate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewPdf('detailed')}
                    disabled={downloadingPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors"
                    title="View detailed technical metrology report in new tab"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>View Detailed Report</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf('detailed')}
                    disabled={downloadingPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors"
                    title="Download multi-page detailed technical metrology report PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Detailed Report</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    disabled={downloadingPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg shadow-xs transition-colors"
                    title="Download complete 12-sheet Excel data workbook"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download Excel</span>
                  </button>

                  <a
                    href={`/public/report/${report.public_verification_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors"
                    title="Open public QR verification page"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>View QR Verification</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedLink ? 'Link Copied' : 'Copy Verification Link'}</span>
                  </button>
                </div>
              </div>

              {/* QR Code and Verification URL Details */}
              <div className="pt-3 border-t border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {report.qr_data_url ? (
                    <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-xs flex-shrink-0">
                      <img
                        src={report.qr_data_url}
                        alt="Verification QR Code"
                        className="w-16 h-16"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                      <QrCode className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-mono text-slate-500 uppercase block">Public Verification URL:</span>
                    <a
                      href={report.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-blue-700 hover:underline break-all"
                    >
                      {report.verification_url}
                    </a>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Inspectors and public authorities can scan this QR code directly without authenticating.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {role === 'officer' && (
                    <button
                      type="button"
                      onClick={() => handleGenerateReport(true)}
                      disabled={generatingReport}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded shadow-xs"
                      title="Re-generate report with latest session data without changing identifiers"
                    >
                      <RefreshCw className={`w-3 h-3 ${generatingReport ? 'animate-spin' : ''}`} />
                      <span>Re-issue</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            role === 'officer' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Ready to Generate Official Documents
                  </h5>
                  <p className="text-xs text-slate-600">
                    Session is approved. Compile the official certificate, detailed report, Excel data, and QR code.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateReport(false)}
                  disabled={generatingReport}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs"
                >
                  <FileText className="w-4 h-4" />
                  <span>{generatingReport ? 'Generating...' : 'Issue Official Report'}</span>
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* INSTRUMENT PHYSICAL EVIDENCE & ORIGINAL NAMEPLATE / LABEL IMAGE    */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              <FileCheck2 className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Instrument Physical Evidence & Original Nameplate / Label
                </h3>
                {instrumentData?.ocr_history?.[0] && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    OCR Verified: {instrumentData.ocr_history[0].ocr_status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical manufacturer marking plate evidence cross-referenced against authoritative test session parameters.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-300 self-start sm:self-auto uppercase">
            OIML R-76 Technical Evidence
          </span>
        </div>

        {loadingInstrument ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading instrument physical evidence...</div>
        ) : (
          (() => {
            const inst = instrumentData?.instrument || {
              manufacturer: session.manufacturer || 'Weighing Systems',
              model_number: session.model_number || 'NAWI Standard',
              serial_number: session.serial_number || 'N/A',
              accuracy_class: session.accuracy_class || 'III',
              max_capacity: session.max_capacity ?? 0,
              min_capacity: session.min_capacity ?? 0,
              verification_scale_interval: session.verification_scale_interval ?? 0,
              scale_interval: session.scale_interval ?? 0,
              unit: session.unit || 'kg',
              instrument_type: session.instrument_type || 'NON_AUTOMATIC',
              device_configuration: {}
            };

            const nameplateFile =
              instrumentData?.files?.find((f) => f.document_type === 'NAMEPLATE') ||
              instrumentData?.files?.find((f) => f.document_type === 'INSTRUMENT_PHOTO') ||
              instrumentData?.files?.[0];

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. INSTRUMENT EVIDENCE (Structured parameters) */}
                <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Instrument Evidence (Registered Baseline)
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: {session.instrument_id?.slice(0, 8)}...
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3 font-mono text-xs">
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">
                            Manufacturer
                          </span>
                          <span className="font-bold text-slate-900">{inst.manufacturer}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">
                            Model Number
                          </span>
                          <span className="font-bold text-slate-900">{inst.model_number}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">
                            Serial Number
                          </span>
                          <span className="font-bold text-blue-700">{inst.serial_number}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">
                            Accuracy Class
                          </span>
                          <span className="font-bold text-slate-900">Class {inst.accuracy_class}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">
                            Maximum Capacity (Max)
                          </span>
                          <span className="font-bold text-slate-900">
                            {inst.max_capacity} {inst.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">
                            Minimum Capacity (Min)
                          </span>
                          <span className="font-bold text-slate-900">
                            {inst.min_capacity} {inst.unit}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">
                            Verification Interval (e)
                          </span>
                          <span className="font-bold text-slate-900">
                            {inst.verification_scale_interval} {inst.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">
                            Scale Interval (d)
                          </span>
                          <span className="font-bold text-slate-900">
                            {inst.scale_interval} {inst.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Officer Verification Notice */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>Officer Metrological Duty:</span>
                    </div>
                    <p className="leading-relaxed">
                      Before approving this session, verify that the physical markings (Max, Min, e, d, Class) in the original nameplate image on the right match the parameters above.
                    </p>
                  </div>
                </div>

                {/* 2. ORIGINAL NAMEPLATE / LABEL IMAGE */}
                <div className="lg:col-span-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Original Nameplate / Label Image
                      </h4>
                      {nameplateFile && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {(nameplateFile.file_size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>

                    {nameplateFile ? (
                      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-xs">
                        <div className="relative group aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden">
                          <img
                            src={InstrumentService.getFileViewUrl(session.instrument_id, nameplateFile.id)}
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
                              <span>Inspect Markings & Zoom</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950/90 border-t border-slate-800 text-slate-300 text-xs flex items-center justify-between">
                          <div className="truncate pr-2">
                            <div className="font-bold text-white truncate text-xs">
                              {nameplateFile.file_name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {new Date(nameplateFile.created_at).toLocaleDateString()} &bull; Uploaded by: {nameplateFile.uploader_name || 'Technician'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveModalFile(nameplateFile)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex-shrink-0 transition-colors shadow-xs"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>Enlarge</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2 bg-slate-50">
                        <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                        <div className="text-xs font-semibold text-slate-700">No Nameplate Image Uploaded</div>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          The technician did not attach a physical nameplate photograph during registration. You may request photographic evidence before approving.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* OCR Extraction Traceability snippet if available */}
                  {instrumentData?.ocr_history?.[0]?.raw_text && (
                    <div className="mt-3 p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400">
                      <div className="text-[10px] text-slate-400 uppercase font-sans font-bold mb-1">
                        Preserved Raw OCR Text Artifact:
                      </div>
                      <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis">
                        {instrumentData.ocr_history[0].raw_text.slice(0, 120)}...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TECHNICAL EVIDENCE INSPECTION: RULE-BY-RULE DECISION TABLE         */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-800 uppercase tracking-wide block">
              Rule-By-Rule Technical Evidence & Audit Trail
            </span>
            <span className="text-[11px] text-slate-500">
              Deterministic verification of Maximum Permissible Error (MPE) for every applicable clause.
            </span>
          </div>
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={evaluating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Re-evaluate Overall Compliance</span>
          </button>
        </div>

        <div className="divide-y divide-slate-200">
          {tests.map((t) => {
            const isPass = t.status === 'PASS';
            const isFail = t.status === 'FAIL';
            const isReview = t.status === 'REVIEW_REQUIRED';
            const isNotApplicable = t.status === 'NOT_APPLICABLE' || t.applicability_status === 'NOT_APPLICABLE';
            const isDraft = t.status === 'DRAFT' || t.status === 'IN_PROGRESS' || t.status === 'INCOMPLETE';

            return (
              <div key={t.id} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {t.code}
                    </span>
                    <span className="font-bold text-xs text-slate-900">{t.name}</span>
                    <span className="text-slate-400 text-xs">&bull;</span>
                    <span className="text-xs text-slate-500 font-mono">{t.r76_reference}</span>
                  </div>

                  <div>
                    {isPass && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        PASS
                      </span>
                    )}
                    {isFail && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-red-800 bg-red-50 border border-red-200">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        FAIL
                      </span>
                    )}
                    {isReview && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        REVIEW REQUIRED
                      </span>
                    )}
                    {isNotApplicable && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-300 font-mono">
                        <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
                        NOT APPLICABLE
                      </span>
                    )}
                    {isDraft && !isNotApplicable && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-300">
                        {t.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 State Indicators Bar */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Impl: <strong>{t.implementation_state}</strong>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded border ${
                      t.applicability_status === 'NOT_APPLICABLE' || isNotApplicable
                        ? 'bg-slate-100 text-slate-600 border-slate-300'
                        : t.applicability_status === 'REVIEW_REQUIRED'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    Applicability: <strong>{t.applicability_status || (isNotApplicable ? 'NOT_APPLICABLE' : 'APPLICABLE')}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Execution: <strong>{t.execution_status || (isNotApplicable ? 'COMPLETED' : isPass || isFail ? 'COMPLETED' : 'NOT_STARTED')}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Result: <strong>{t.status}</strong>
                  </span>
                </div>

                {/* Calculation Details */}
                {t.calculation_summary ? (
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(t.calculation_summary, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    No calculations run yet for this test module.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: RETURN FOR CORRECTION                                       */}
      {/* ------------------------------------------------------------------ */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-700">
              <CornerUpLeft className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Return Test Session for Correction
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Enter specific instructions for the technician detailing which observation, test module, or parameter needs correction or re-calibration.
            </p>
            <div>
              <textarea
                rows={4}
                value={returnComments}
                onChange={(e) => setReturnComments(e.target.value)}
                placeholder="e.g. Please verify zero setting reading at step 1. Reading ΔL requires recalibration check."
                className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:ring-1 focus:ring-amber-600 outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={returning}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-amber-700 hover:bg-amber-800 rounded transition-colors"
              >
                {returning ? 'Returning...' : 'Return Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: REJECT SESSION                                              */}
      {/* ------------------------------------------------------------------ */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <XOctagon className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Reject Test Session
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Provide formal regulatory justification for rejecting this test session. Rejected sessions cannot proceed to certificate issuance.
            </p>
            <div>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Repeatability differences exceed allowable bounds under OIML R-76 Clause 3.6.1."
                className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:ring-1 focus:ring-red-600 outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-700 hover:bg-red-800 rounded transition-colors"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: APPROVE VERIFICATION & ISSUE ARTIFACTS                      */}
      {/* ------------------------------------------------------------------ */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Award className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Approve Verification & Issue Official Report?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to approve this test session? After approval, the official legal metrology certificate (1-page), detailed technical report, Excel workbook, and QR verification ID will be generated and officially issued.
            </p>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 space-y-1">
              <div><strong>Session Number:</strong> {session.session_number}</div>
              <div><strong>Instrument:</strong> {session.manufacturer} {session.model_number} (SN: {session.serial_number})</div>
              <div><strong>Approving Officer:</strong> Anand Deshpande</div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowApproveModal(false);
                  handleApproveSession();
                }}
                disabled={approving}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors shadow-xs"
              >
                {approving ? 'Approving...' : 'Approve & Issue Official Report'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Officer Lightbox Modal for Nameplate Inspection */}
      {session.instrument_id && (
        <ImageViewerModal
          isOpen={!!activeModalFile}
          onClose={() => setActiveModalFile(null)}
          imageUrl={
            activeModalFile
              ? InstrumentService.getFileViewUrl(session.instrument_id, activeModalFile.id)
              : null
          }
          title={`Officer Physical Evidence Inspection: ${activeModalFile?.file_name || 'Instrument Nameplate'}`}
          metadata={{
            fileName: activeModalFile?.file_name,
            fileSize: activeModalFile?.file_size,
            uploadDate: activeModalFile?.created_at,
            uploadedBy: activeModalFile?.uploader_name || activeModalFile?.uploaded_by,
            ocrStatus: instrumentData?.ocr_history?.[0]?.ocr_status
          }}
        />
      )}
    </div>
  );
};
