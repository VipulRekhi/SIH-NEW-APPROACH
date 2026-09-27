import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';
import { ReportRepository } from '../repositories/report.repository.js';
import { TestSessionRepository } from '../repositories/test-session.repository.js';
import { InstrumentRepository } from '../repositories/instrument.repository.js';
import { TestSessionService } from './test-session.service.js';
import { PdfService } from './pdf.service.js';
import type { JwtPayload } from '../types/index.js';

export class ReportService {
  /**
   * Generates or retrieves an official test report for a finalized test session.
   */
  static async generateReport(
    sessionId: string,
    user: JwtPayload,
    clientOrigin?: string,
    forceRegenerate: boolean = false
  ) {
    // 1. Load test session
    const session = await TestSessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Test session not found.', 404, 'SESSION_NOT_FOUND');
    }

    // 2. Permission check: Institutional Role Separation (Technicians cannot issue official reports)
    if (user.role === 'technician') {
      throw new AppError(
        'Access denied: Technicians cannot generate or issue official test reports and certificates. Only an authorized Officer can approve and issue official reports.',
        403,
        'FORBIDDEN'
      );
    }

    if (user.role !== 'admin' && user.laboratoryId && session.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied: You do not have permission for this laboratory.', 403, 'FORBIDDEN');
    }

    // 2b. Approval verification: Unless force flag is provided, session must be in APPROVED or OFFICIAL_REPORT_GENERATED state
    if (session.workflow_status !== 'APPROVED' && session.workflow_status !== 'OFFICIAL_REPORT_GENERATED' && !forceRegenerate) {
      throw new AppError(
        `Cannot issue official report for test session in "${session.workflow_status}" status. The session must be formally reviewed and approved by an Officer before report generation.`,
        400,
        'SESSION_NOT_APPROVED'
      );
    }

    // 3. Load all tests for this session
    const tests = await TestSessionRepository.getTestsForSession(sessionId);
    if (tests.length === 0) {
      throw new AppError('Cannot generate report: No tests assigned to session.', 400, 'NO_TESTS');
    }

    // 4. Obtain authoritative compliance result from canonical compliance engine
    const evaluation = await TestSessionService.evaluateSessionOverallStatus(sessionId);

    // 5. Incomplete mandatory tests check:
    // If ANY mandatory test is FAIL, the session is definitively FAILED and a NON-COMPLIANT report can be generated.
    // However, if no test is FAIL but one or more mandatory tests are incomplete/pending,
    // generation of a compliant PASS certificate is strictly prohibited (Test 7).
    const incompleteMandatory = tests.filter(t => 
      t.applicability_status !== 'NOT_APPLICABLE' && 
      ['DRAFT', 'IN_PROGRESS', 'INCOMPLETE', 'PENDING'].includes(t.status)
    );

    if (evaluation.overallStatus !== 'FAILED' && incompleteMandatory.length > 0) {
      const pendingNames = incompleteMandatory.map(t => `${t.name} (${t.code})`).join(', ');
      throw new AppError(
        `Cannot generate official report. Mandatory tests incomplete: ${pendingNames}. A compliant certificate cannot be issued until all mandatory tests are completed.`,
        400,
        'INCOMPLETE_MANDATORY_TESTS',
        {
          incompleteTests: incompleteMandatory.map(t => ({
            id: t.id,
            name: t.name,
            code: t.code,
            status: t.status
          }))
        }
      );
    }

    // 6. Check if an official report already exists for this session
    const existingReport = await ReportRepository.findByTestSessionId(sessionId);
    if (existingReport && !forceRegenerate) {
      const hasCert = existingReport.certificate_pdf_path && fs.existsSync(existingReport.certificate_pdf_path);
      const hasDetailed = existingReport.detailed_pdf_path && fs.existsSync(existingReport.detailed_pdf_path);
      const hasExcel = existingReport.excel_path && fs.existsSync(existingReport.excel_path);
      // Return existing only if canonical status strictly matches and all files exist on disk
      if (existingReport.overall_status === evaluation.overallStatus && hasCert && hasDetailed && hasExcel) {
        return existingReport;
      }
    }

    // 7. Load instrument record
    const instrument = await InstrumentRepository.findById(session.instrument_id);
    if (!instrument) {
      throw new AppError('Instrument record not found.', 404, 'INSTRUMENT_NOT_FOUND');
    }

    // 8. Assemble detailed test results snapshot
    const testResultsSnapshot: any[] = [];
    for (const t of tests) {
      const observations = await TestSessionRepository.getObservationsForTest(t.id);
      const results = await TestSessionRepository.getResultsForTest(t.id);
      testResultsSnapshot.push({
        id: t.id,
        code: t.code,
        name: t.name,
        r76Reference: t.r76_reference,
        status: t.status,
        applicabilityStatus: t.applicability_status,
        applicabilityReason: t.applicability_reason,
        observationsCount: observations.length,
        calculationSummary: t.calculation_summary,
        observations,
        results
      });
    }

    // 9. Assign unique report number and public verification ID
    // If regenerating an existing report, preserve the identifiers to avoid conflicts
    let reportNumber: string;
    let publicVerificationId: string;

    if (existingReport) {
      reportNumber = existingReport.report_number;
      publicVerificationId = existingReport.public_verification_id;
    } else {
      reportNumber = await ReportRepository.getNextReportNumber();
      const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
      publicVerificationId = `R76-${new Date().getFullYear()}-${randomPart}`;
    }

    // 10. Construct dynamic public verification URL
    // Priority: caller-provided origin -> request Origin header -> config.clientUrl
    const effectiveOrigin = (clientOrigin || config.clientUrl || 'http://localhost:5173').replace(/\/$/, '');
    const verificationUrl = `${effectiveOrigin}/public/report/${publicVerificationId}`;

    // 11. Generate Print-Ready PDFs (Both 1-Page Certificate and Multi-Page Detailed Report) & QR Code
    const {
      certificatePdfPath,
      certificateFileName,
      detailedPdfPath,
      detailedFileName,
      excelPath,
      excelFileName,
      pdfPath,
      fileName,
      qrDataUrl
    } = await PdfService.generateReportPdf({
      reportNumber,
      publicVerificationId,
      verificationUrl,
      regulatoryMode: session.regulatory_mode,
      regulationVersion: session.regulation_version,
      overallStatus: evaluation.overallStatus,
      complianceExplanation: evaluation.explanation,
      complianceSummary: evaluation,
      generatedAt: new Date(),
      laboratory: {
        name: session.laboratory_name,
        technicianName: session.technician_name
      },
      instrument: {
        manufacturer: session.manufacturer,
        modelNumber: session.model_number,
        serialNumber: session.serial_number,
        instrumentType: session.instrument_type,
        accuracyClass: session.accuracy_class,
        maxCapacity: Number(session.max_capacity),
        minCapacity: Number(session.min_capacity),
        scaleInterval: Number(session.scale_interval),
        verificationScaleInterval: Number(session.verification_scale_interval),
        unit: session.unit,
        deviceConfiguration: instrument.device_configuration
      },
      environmental: session.environmental_conditions || {},
      tests: testResultsSnapshot
    });

    // 12. Persist Report record in database
    let savedReport;
    if (existingReport) {
      savedReport = await ReportRepository.update(existingReport.id, {
        overallStatus: evaluation.overallStatus,
        complianceExplanation: evaluation.explanation,
        complianceSummary: evaluation,
        environmentalSnapshot: session.environmental_conditions || {},
        instrumentSnapshot: {
          manufacturer: session.manufacturer,
          modelNumber: session.model_number,
          serialNumber: session.serial_number,
          instrumentType: session.instrument_type,
          accuracyClass: session.accuracy_class,
          maxCapacity: Number(session.max_capacity),
          minCapacity: Number(session.min_capacity),
          scaleInterval: Number(session.scale_interval),
          verificationScaleInterval: Number(session.verification_scale_interval),
          unit: session.unit
        },
        testResultsSnapshot,
        verificationUrl,
        pdfFileName: fileName,
        pdfPath,
        certificatePdfFileName: certificateFileName,
        certificatePdfPath,
        detailedPdfFileName: detailedFileName,
        detailedPdfPath,
        excelFileName,
        excelPath,
        qrDataUrl,
        officerId: user.userId,
        technicianId: session.created_by
      });
      savedReport = await ReportRepository.findById(existingReport.id);
    } else {
      savedReport = await ReportRepository.create({
        reportNumber,
        publicVerificationId,
        testSessionId: session.id,
        instrumentId: session.instrument_id,
        laboratoryId: session.laboratory_id,
        generatedBy: user.userId,
        officerId: user.userId,
        technicianId: session.created_by,
        regulatoryMode: session.regulatory_mode,
        regulationVersion: session.regulation_version,
        overallStatus: evaluation.overallStatus,
        complianceExplanation: evaluation.explanation,
        complianceSummary: evaluation,
        environmentalSnapshot: session.environmental_conditions || {},
        instrumentSnapshot: {
          manufacturer: session.manufacturer,
          modelNumber: session.model_number,
          serialNumber: session.serial_number,
          instrumentType: session.instrument_type,
          accuracyClass: session.accuracy_class,
          maxCapacity: Number(session.max_capacity),
          minCapacity: Number(session.min_capacity),
          scaleInterval: Number(session.scale_interval),
          verificationScaleInterval: Number(session.verification_scale_interval),
          unit: session.unit
        },
        testResultsSnapshot,
        verificationUrl,
        pdfFileName: fileName,
        pdfPath,
        certificatePdfFileName: certificateFileName,
        certificatePdfPath,
        detailedPdfFileName: detailedFileName,
        detailedPdfPath,
        excelFileName,
        excelPath,
        qrDataUrl
      });
    }

    // Update test session workflow status to APPROVED
    await TestSessionRepository.updateWorkflow(session.id, {
      workflowStatus: 'APPROVED'
    });

    // PART 17: Canonical Consistency Verification Check
    if (savedReport.overall_status !== evaluation.overallStatus) {
      throw new AppError(
        `REPORT GENERATION BLOCKED: Generated report artifact status (${savedReport.overall_status}) does not match canonical metrological result (${evaluation.overallStatus}).`,
        500,
        'CONSISTENCY_CHECK_FAILED'
      );
    }

    return savedReport;
  }

  /**
   * Retrieves an authenticated report by internal report ID.
   */
  static async getReportById(id: string, user: JwtPayload) {
    const report = await ReportRepository.findById(id);
    if (!report) {
      throw new AppError('Report not found.', 404, 'REPORT_NOT_FOUND');
    }

    if (user.role !== 'admin' && user.laboratoryId && report.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied.', 403, 'FORBIDDEN');
    }

    return report;
  }

  /**
   * Retrieves an authenticated report by session ID.
   */
  static async getReportBySessionId(sessionId: string, user: JwtPayload) {
    let report = await ReportRepository.findByTestSessionId(sessionId);
    if (!report) {
      return null;
    }

    if (user.role !== 'admin' && user.laboratoryId && report.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied.', 403, 'FORBIDDEN');
    }

    // Auto-synchronize if underlying session status has changed
    try {
      const canonical = await TestSessionService.evaluateSessionOverallStatus(sessionId);
      if (report.overall_status !== canonical.overallStatus) {
        await this.invalidateAndSyncReport(sessionId);
        const refreshed = await ReportRepository.findByTestSessionId(sessionId);
        if (refreshed) {
          report = refreshed;
        }
      }
    } catch {
      // Ignore
    }

    return report;
  }

  /**
   * Public report verification lookup (UNAUTHENTICATED).
   * Strips all internal database IDs, passwords, tokens, and returns sanitized public verification data
   * WITH COMPLETE TRACEABILITY OF OBSERVATIONS, CALCULATIONS, MPE LIMITS, AND DECISIONS.
   */
  static async getPublicVerification(verificationId: string) {
    const report = await ReportRepository.findByPublicVerificationId(verificationId);
    if (!report) {
      throw new AppError('The requested report could not be verified or does not exist.', 404, 'REPORT_NOT_FOUND');
    }

    // Auto-synchronize if underlying session status has changed
    if (report.test_session_id) {
      try {
        const canonical = await TestSessionService.evaluateSessionOverallStatus(report.test_session_id);
        if (report.overall_status !== canonical.overallStatus) {
          await this.invalidateAndSyncReport(report.test_session_id);
          const refreshed = await ReportRepository.findByPublicVerificationId(verificationId);
          if (refreshed) {
            Object.assign(report, refreshed);
          }
        }
      } catch {
        // Fall back to report snapshot
      }
    }

    // Build comprehensive public test trace
    const testList = (report.test_results_snapshot || []).map((t: any) => ({
      code: t.code,
      name: t.name,
      clause: t.r76Reference,
      status: t.status,
      applicabilityStatus: t.applicabilityStatus,
      summary: t.calculationSummary,
      observations: (t.observations || []).map((o: any) => ({
        sequenceNo: o.sequence_no,
        direction: o.direction,
        loadValue: o.load_value,
        loadUnit: o.load_unit,
        indicationValue: o.indication_value,
        indicationUnit: o.indication_unit,
        additionalLoad: o.additional_load,
        zeroError: o.zero_error,
        rawError: o.raw_error,
        correctedError: o.corrected_error,
        position: o.position,
        repeatNumber: o.repeat_number,
        remarks: o.remarks
      })),
      results: (t.results || []).map((r: any) => ({
        resultType: r.result_type || r.resultType,
        value: r.value,
        unit: r.unit,
        limitValue: r.limit_value || r.limitValue,
        passFail: r.pass_fail || r.passFail,
        calculationReference: r.calculation_reference || r.calculationReference,
        calculationDetails: r.calculation_details || r.calculationDetails
      }))
    }));

    return {
      reportNumber: report.report_number,
      verificationId: report.public_verification_id,
      generatedAt: report.created_at,
      regulatoryMode: report.regulatory_mode,
      regulationVersion: report.regulation_version,
      overallStatus: report.overall_status,
      complianceExplanation: report.compliance_explanation,
      complianceSummary: report.compliance_summary,
      laboratory: {
        name: report.laboratory_name || 'Accredited Verification Laboratory',
        address: report.laboratory_address || null
      },
      instrument: report.instrument_snapshot || {},
      environmental: report.environmental_snapshot || {},
      testSummary: {
        totalTests: testList.length,
        passedTests: testList.filter((t: any) => t.status === 'PASS').length,
        failedTests: testList.filter((t: any) => t.status === 'FAIL').length,
        reviewRequiredTests: testList.filter((t: any) => t.status === 'REVIEW_REQUIRED').length,
        notApplicableTests: testList.filter((t: any) => t.status === 'NOT_APPLICABLE').length,
        tests: testList
      },
      tests: testList,
      verificationUrl: report.verification_url,
      qrDataUrl: report.qr_data_url,
      pdfDownloadUrl: `/api/public/reports/${verificationId}/pdf?type=certificate`,
      certificateDownloadUrl: `/api/public/reports/${verificationId}/pdf?type=certificate`,
      detailedDownloadUrl: `/api/public/reports/${verificationId}/pdf?type=detailed`,
      excelDownloadUrl: `/api/public/reports/${verificationId}/excel`
    };
  }

  /**
   * Retrieves the physical PDF or Excel path for a public verification ID (Certificate, Detailed, or Excel).
   */
  static async getPublicPdfFile(verificationId: string, type: string = 'certificate') {
    const report = await ReportRepository.findByPublicVerificationId(verificationId);
    if (!report) {
      throw new AppError('Report not found.', 404, 'REPORT_NOT_FOUND');
    }

    const isExcel = type === 'excel';
    const isDetailed = type === 'detailed';
    const targetPath = isExcel
      ? report.excel_path
      : (isDetailed ? (report.detailed_pdf_path || report.pdf_path) : (report.certificate_pdf_path || report.pdf_path));
    const targetName = isExcel
      ? (report.excel_file_name || `${report.report_number}_test_data.xlsx`)
      : (isDetailed ? (report.detailed_pdf_file_name || `${report.report_number}_detailed.pdf`) : (report.certificate_pdf_file_name || `${report.report_number}_certificate.pdf`));

    // If file exists on disk, return it directly
    if (targetPath && fs.existsSync(targetPath)) {
      return { filePath: targetPath, fileName: targetName };
    }

    // Defensive fallback: regenerate PDF/Excel files if missing from disk
    const dualPdf = await PdfService.generateReportPdf({
      reportNumber: report.report_number,
      publicVerificationId: report.public_verification_id,
      verificationUrl: report.verification_url,
      regulatoryMode: report.regulatory_mode,
      regulationVersion: report.regulation_version,
      overallStatus: report.overall_status,
      complianceExplanation: report.compliance_explanation,
      complianceSummary: report.compliance_summary,
      generatedAt: report.created_at,
      laboratory: {
        name: report.laboratory_name,
        address: report.laboratory_address
      },
      instrument: report.instrument_snapshot,
      environmental: report.environmental_snapshot,
      tests: report.test_results_snapshot || []
    });

    const chosenPath = isExcel ? dualPdf.excelPath : (isDetailed ? dualPdf.detailedPdfPath : dualPdf.certificatePdfPath);
    const chosenName = isExcel ? dualPdf.excelFileName : (isDetailed ? dualPdf.detailedFileName : dualPdf.certificateFileName);

    // Save regenerated paths to database if missing
    await ReportRepository.update(report.id, {
      certificatePdfPath: dualPdf.certificatePdfPath,
      certificatePdfFileName: dualPdf.certificateFileName,
      detailedPdfPath: dualPdf.detailedPdfPath,
      detailedPdfFileName: dualPdf.detailedFileName,
      excelPath: dualPdf.excelPath,
      excelFileName: dualPdf.excelFileName
    });

    return {
      filePath: chosenPath,
      fileName: chosenName
    };
  }

  /**
   * Retrieves the physical PDF or Excel path for an authenticated user (Certificate, Detailed, or Excel).
   */
  static async getAuthenticatedPdfFile(reportId: string, user: JwtPayload, type: string = 'certificate') {
    const report = await this.getReportById(reportId, user);
    const isExcel = type === 'excel';
    const isDetailed = type === 'detailed';
    const targetPath = isExcel
      ? report.excel_path
      : (isDetailed ? (report.detailed_pdf_path || report.pdf_path) : (report.certificate_pdf_path || report.pdf_path));
    const targetName = isExcel
      ? (report.excel_file_name || `${report.report_number}_test_data.xlsx`)
      : (isDetailed ? (report.detailed_pdf_file_name || `${report.report_number}_detailed.pdf`) : (report.certificate_pdf_file_name || `${report.report_number}_certificate.pdf`));

    if (targetPath && fs.existsSync(targetPath)) {
      return { filePath: targetPath, fileName: targetName };
    }

    // Defensive fallback: regenerate
    const dualPdf = await PdfService.generateReportPdf({
      reportNumber: report.report_number,
      publicVerificationId: report.public_verification_id,
      verificationUrl: report.verification_url,
      regulatoryMode: report.regulatory_mode,
      regulationVersion: report.regulation_version,
      overallStatus: report.overall_status,
      complianceExplanation: report.compliance_explanation,
      complianceSummary: report.compliance_summary,
      generatedAt: report.created_at,
      laboratory: {
        name: report.laboratory_name,
        address: report.laboratory_address
      },
      instrument: report.instrument_snapshot,
      environmental: report.environmental_snapshot,
      tests: report.test_results_snapshot || []
    });

    const chosenPath = isExcel ? dualPdf.excelPath : (isDetailed ? dualPdf.detailedPdfPath : dualPdf.certificatePdfPath);
    const chosenName = isExcel ? dualPdf.excelFileName : (isDetailed ? dualPdf.detailedFileName : dualPdf.certificateFileName);

    await ReportRepository.update(report.id, {
      certificatePdfPath: dualPdf.certificatePdfPath,
      certificatePdfFileName: dualPdf.certificateFileName,
      detailedPdfPath: dualPdf.detailedPdfPath,
      detailedPdfFileName: dualPdf.detailedFileName,
      excelPath: dualPdf.excelPath,
      excelFileName: dualPdf.excelFileName
    });

    return {
      filePath: chosenPath,
      fileName: chosenName
    };
  }

  /**
   * Updates or invalidates existing report after session data changes or test deletion.
   * Recalculates canonical compliance and updates database record immediately.
   */
  static async invalidateAndSyncReport(sessionId: string) {
    const existingReport = await ReportRepository.findByTestSessionId(sessionId);
    if (!existingReport) return;

    // 1. Remove obsolete cached pdf/excel files if any
    try {
      if (existingReport.pdf_path && fs.existsSync(existingReport.pdf_path)) fs.unlinkSync(existingReport.pdf_path);
      if (existingReport.certificate_pdf_path && fs.existsSync(existingReport.certificate_pdf_path)) fs.unlinkSync(existingReport.certificate_pdf_path);
      if (existingReport.detailed_pdf_path && fs.existsSync(existingReport.detailed_pdf_path)) fs.unlinkSync(existingReport.detailed_pdf_path);
      if (existingReport.excel_path && fs.existsSync(existingReport.excel_path)) fs.unlinkSync(existingReport.excel_path);
    } catch {
      // Ignore unlink errors
    }

    // 2. Obtain current canonical evaluation
    const evaluation = await TestSessionService.evaluateSessionOverallStatus(sessionId);

    // 3. Assemble current test snapshot
    const tests = await TestSessionRepository.getTestsForSession(sessionId);
    const testResultsSnapshot: any[] = [];
    for (const t of tests) {
      const observations = await TestSessionRepository.getObservationsForTest(t.id);
      const results = await TestSessionRepository.getResultsForTest(t.id);
      testResultsSnapshot.push({
        id: t.id,
        code: t.code,
        name: t.name,
        r76Reference: t.r76_reference,
        status: t.status,
        applicabilityStatus: t.applicability_status,
        applicabilityReason: t.applicability_reason,
        observationsCount: observations.length,
        calculationSummary: t.calculation_summary,
        observations,
        results
      });
    }

    // 4. Update database report record
    await ReportRepository.update(existingReport.id, {
      overallStatus: evaluation.overallStatus,
      complianceExplanation: evaluation.explanation,
      complianceSummary: evaluation,
      testResultsSnapshot,
      pdfPath: null,
      certificatePdfPath: null,
      detailedPdfPath: null,
      excelPath: null,
      excelFileName: null
    } as any);
  }

  static async syncSessionReportAfterModification(sessionId: string) {
    return this.invalidateAndSyncReport(sessionId);
  }

  /**
   * Lists reports for the authenticated user's scope with comprehensive repository filtering.
   */
  static async listReports(
    user: JwtPayload,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      overallStatus?: string;
      regulatoryMode?: string;
      instrumentId?: string;
      startDate?: string;
      endDate?: string;
      laboratoryId?: string;
    } | number = 1,
    limitArg: number = 20,
    searchArg?: string
  ) {
    let page = 1;
    let limit = 20;
    let search: string | undefined = undefined;
    let status: string | undefined = undefined;
    let overallStatus: string | undefined = undefined;
    let regulatoryMode: string | undefined = undefined;
    let instrumentId: string | undefined = undefined;
    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;
    let laboratoryId: string | undefined = undefined;

    if (typeof params === 'object') {
      page = params.page || 1;
      limit = params.limit || 20;
      search = params.search;
      status = params.status;
      overallStatus = params.overallStatus;
      regulatoryMode = params.regulatoryMode;
      instrumentId = params.instrumentId;
      startDate = params.startDate;
      endDate = params.endDate;
      laboratoryId = params.laboratoryId;
    } else {
      page = params || 1;
      limit = limitArg || 20;
      search = searchArg;
    }

    const offset = (page - 1) * limit;
    const effectiveLabId = user.role === 'admin' ? (laboratoryId || undefined) : (user.laboratoryId || undefined);

    const result = await ReportRepository.list({
      laboratoryId: effectiveLabId,
      search,
      status,
      overallStatus,
      regulatoryMode,
      instrumentId,
      startDate,
      endDate,
      limit,
      offset
    });

    return {
      reports: result.reports,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
  }
}
