import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { DashboardPage } from '../pages/DashboardPage';

import { InstrumentListPage } from '../pages/instruments/InstrumentListPage';
import { CreateInstrumentPage } from '../pages/instruments/CreateInstrumentPage';
import { InstrumentDetailPage } from '../pages/instruments/InstrumentDetailPage';
import { EditInstrumentPage } from '../pages/instruments/EditInstrumentPage';

import { TestSessionListPage } from '../pages/tests/TestSessionListPage';
import { CreateTestSessionPage } from '../pages/tests/CreateTestSessionPage';
import { TestWorkspacePage } from '../pages/tests/TestWorkspacePage';

import { ReportsListPage } from '../pages/reports/ReportsListPage';
import { PublicReportVerificationPage } from '../pages/public/PublicReportVerificationPage';

import { UsersPage } from '../pages/admin/UsersPage';
import { LaboratoriesPage } from '../pages/admin/LaboratoriesPage';
import { AuditLogsPage } from '../pages/admin/AuditLogsPage';
import { SettingsPage } from '../pages/admin/SettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root Redirect */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      {/* Standalone Isolated Public Verification Route (Phase 4) - NO AUTH, NO PORTAL SHELL */}
      <Route path="/public/report/:verificationId" element={<PublicReportVerificationPage />} />

      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Protected Application Routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Phase 2: Active Instrument & OCR Module */}
        <Route path="instruments" element={<InstrumentListPage />} />
        <Route path="instruments/new" element={<CreateInstrumentPage />} />
        <Route path="instruments/:id" element={<InstrumentDetailPage />} />
        <Route path="instruments/:id/edit" element={<EditInstrumentPage />} />

        {/* Phase 3: OIML R-76 Testing & Calculation Engine */}
        <Route path="tests" element={<TestSessionListPage />} />
        <Route path="tests/new" element={<CreateTestSessionPage />} />
        <Route path="tests/:id" element={<TestWorkspacePage />} />

        {/* Phase 4: Official Test Report & QR Verification Registry */}
        <Route path="reports" element={<ReportsListPage />} />

        {/* Phase 5: Administration & System Registry */}
        <Route path="users" element={<UsersPage />} />
        <Route path="laboratories" element={<LaboratoriesPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
