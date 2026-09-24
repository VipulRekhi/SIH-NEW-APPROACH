import { api } from './api';
import type {
  TestSession,
  TestSessionTest,
  TestObservation,
  TestResult,
  TestType,
  RecommendedLoadPoint,
  RegulatoryMode
} from '../types/test.types';

export class TestSessionService {
  static async getTestTypes(): Promise<TestType[]> {
    const res = await api.get('/test-types');
    return res.data.data.testTypes;
  }

  static async getRuleRegistry(): Promise<any[]> {
    const res = await api.get('/test-rule-registry');
    return res.data.data.rules;
  }

  static async listSessions(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ sessions: TestSession[]; pagination: any }> {
    const res = await api.get('/test-sessions', { params });
    return {
      sessions: res.data.data.sessions,
      pagination: res.data.pagination
    };
  }

  static async getSession(id: string): Promise<{ session: TestSession; tests: TestSessionTest[] }> {
    const res = await api.get(`/test-sessions/${id}`);
    return res.data.data;
  }

  static async createSession(payload: {
    instrumentId: string;
    regulatoryMode?: RegulatoryMode;
    testDate?: string;
    environmentalConditions?: any;
    referenceStandards?: any[];
    selectedTestTypeIds?: string[];
    notes?: string;
  }): Promise<{ session: TestSession; tests: TestSessionTest[] }> {
    const res = await api.post('/test-sessions', payload);
    return res.data.data;
  }

  static async updateSession(
    id: string,
    payload: { environmentalConditions?: any; referenceStandards?: any[]; notes?: string }
  ): Promise<TestSession> {
    const res = await api.put(`/test-sessions/${id}`, payload);
    return res.data.data.session;
  }

  static async updateStatus(id: string, status: string): Promise<TestSession> {
    const res = await api.patch(`/test-sessions/${id}/status`, { status });
    return res.data.data.session;
  }

  static async generatePlan(id: string): Promise<RecommendedLoadPoint[]> {
    const res = await api.post(`/test-sessions/${id}/plan`);
    return res.data.data.plan;
  }

  static async getObservations(
    sessionId: string,
    testId: string
  ): Promise<{ test: TestSessionTest; observations: TestObservation[]; results: TestResult[] }> {
    const res = await api.get(`/test-sessions/${sessionId}/tests/${testId}/observations`);
    return res.data.data;
  }

  static async addObservation(
    sessionId: string,
    testId: string,
    payload: {
      sequenceNo: number;
      direction?: 'LOADING' | 'UNLOADING' | 'NONE';
      loadValue: number;
      loadUnit?: string;
      indicationValue: number;
      indicationUnit?: string;
      additionalLoad?: number | null;
      zeroError?: number | null;
      position?: string | null;
      repeatNumber?: number | null;
      remarks?: string | null;
    }
  ): Promise<TestObservation> {
    const res = await api.post(`/test-sessions/${sessionId}/tests/${testId}/observations`, payload);
    return res.data.data.observation;
  }

  static async deleteObservation(
    sessionId: string,
    testId: string,
    obsId: string
  ): Promise<void> {
    await api.delete(`/test-sessions/${sessionId}/tests/${testId}/observations/${obsId}`);
  }

  static async calculateTest(
    sessionId: string,
    testId: string
  ): Promise<{ test: TestSessionTest; status: string; summary: any; results: any[] }> {
    const res = await api.post(`/test-sessions/${sessionId}/tests/${testId}/calculate`);
    return res.data.data;
  }

  static async evaluateSession(
    sessionId: string
  ): Promise<{ overallStatus: string; session: TestSession; tests: TestSessionTest[] }> {
    const res = await api.post(`/test-sessions/${sessionId}/evaluate`);
    return res.data.data;
  }
}
