import { api } from './api';
import type { Report, PublicVerificationReport } from '../types/report.types';

export class ReportService {
  /**
   * Generates or fetches the official test report for a session (Authenticated).
   */
  static async generateReport(sessionId: string, forceRegenerate: boolean = false): Promise<Report> {
    const origin = window.location.origin;
    const response = await api.post(`/reports/generate/${sessionId}`, {
      origin,
      forceRegenerate
    });
    return response.data.data.report;
  }

  /**
   * Fetches an official report by internal ID (Authenticated).
   */
  static async getReport(id: string): Promise<Report> {
    const response = await api.get(`/reports/${id}`);
    return response.data.data.report;
  }

  /**
   * Checks if an official report already exists for a test session (Authenticated).
   */
  static async getReportBySession(sessionId: string): Promise<Report | null> {
    const response = await api.get(`/reports/session/${sessionId}`);
    return response.data.data.report;
  }

  /**
   * Lists generated reports for the current laboratory / admin (Authenticated).
   */
  static async listReports(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    regulatoryMode?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    reports: Report[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await api.get('/reports', { params });
    return {
      reports: response.data.data.reports,
      pagination: response.data.pagination
    };
  }

  /**
   * Downloads official PDF report for an authenticated user (Certificate or Detailed).
   */
  static async downloadPdf(
    reportId: string,
    fallbackFileName?: string,
    type: 'certificate' | 'detailed' = 'certificate'
  ): Promise<void> {
    const response = await api.get(`/reports/${reportId}/pdf`, {
      params: { type },
      responseType: 'blob'
    });

    const defaultName = type === 'certificate' ? `NAWI-Certificate-${reportId}.pdf` : `NAWI-Detailed-Report-${reportId}.pdf`;
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fallbackFileName || defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  /**
   * Opens official PDF report in a new tab for previewing.
   */
  static async viewPdf(
    reportId: string,
    type: 'certificate' | 'detailed' = 'certificate'
  ): Promise<void> {
    const response = await api.get(`/reports/${reportId}/pdf`, {
      params: { type },
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const fileUrl = window.URL.createObjectURL(blob);
    window.open(fileUrl, '_blank');
  }

  /**
   * Downloads official Excel workbook for an authenticated user.
   */
  static async downloadExcel(
    reportId: string,
    fallbackFileName?: string
  ): Promise<void> {
    const response = await api.get(`/reports/${reportId}/excel`, {
      responseType: 'blob'
    });

    const defaultName = `NAWI-Test-Data-${reportId}.xlsx`;
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fallbackFileName || defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  /**
   * Fetches public verification data (UNAUTHENTICATED).
   */
  static async getPublicVerification(verificationId: string): Promise<PublicVerificationReport> {
    const response = await api.get(`/public/reports/${verificationId}`);
    return response.data.data.verification;
  }

  /**
   * Downloads public PDF report (UNAUTHENTICATED) - Certificate or Detailed.
   */
  static async downloadPublicPdf(
    verificationId: string,
    fallbackFileName?: string,
    type: 'certificate' | 'detailed' = 'certificate'
  ): Promise<void> {
    const response = await api.get(`/public/reports/${verificationId}/pdf`, {
      params: { type },
      responseType: 'blob'
    });

    const defaultName = type === 'certificate' ? `${verificationId}_certificate.pdf` : `${verificationId}_detailed.pdf`;
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fallbackFileName || defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  /**
   * Downloads public Excel workbook (UNAUTHENTICATED).
   */
  static async downloadPublicExcel(
    verificationId: string,
    fallbackFileName?: string
  ): Promise<void> {
    const response = await api.get(`/public/reports/${verificationId}/excel`, {
      responseType: 'blob'
    });

    const defaultName = `${verificationId}_test_data.xlsx`;
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fallbackFileName || defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}
