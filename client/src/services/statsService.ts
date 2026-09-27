import { api } from './api';

export interface DashboardStats {
  role: 'technician' | 'officer' | 'admin';
  userName: string;
  laboratoryName: string | null;
  technician?: {
    myTests: number;
    draft: number;
    awaitingReview: number;
    underReview: number;
    returned: number;
    approved: number;
    passed: number;
    failed: number;
    reviewRequired: number;
    recentTests: any[];
  };
  officer?: {
    pendingReviews: number;
    underReview: number;
    approved: number;
    rejected: number;
    returned: number;
    passed: number;
    failed: number;
    reviewRequired: number;
    reviewQueue: any[];
    recentReports: any[];
  };
  admin?: {
    totalUsers: number;
    technicians: number;
    officers: number;
    laboratories: number;
    instruments: number;
    testSessions: number;
    officialReports: number;
    passedReports: number;
    failedReports: number;
    pendingReviews: number;
    recentAuditLogs: any[];
  };
}

export class StatsService {
  static async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get('/stats/dashboard');
    return response.data.data;
  }
}
