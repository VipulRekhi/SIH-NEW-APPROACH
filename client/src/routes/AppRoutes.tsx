import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

import { InstrumentListPage } from '../pages/instruments/InstrumentListPage';
import { CreateInstrumentPage } from '../pages/instruments/CreateInstrumentPage';
import { InstrumentDetailPage } from '../pages/instruments/InstrumentDetailPage';
import { EditInstrumentPage } from '../pages/instruments/EditInstrumentPage';

import { TestSessionListPage } from '../pages/tests/TestSessionListPage';
import { CreateTestSessionPage } from '../pages/tests/CreateTestSessionPage';
import { TestWorkspacePage } from '../pages/tests/TestWorkspacePage';

import {
  FileText,
  Users,
  Building2,
  Settings
} from 'lucide-react';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root Redirect */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

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

        {/* Phase 4: Official Test Report Generator Placeholder */}
        <Route
          path="reports"
          element={
            <PlaceholderPage
              title="Official Test Report Generator & QR Verification"
              phase={4}
              phaseName="Phase 4: Report Generation + QR"
              description="Automated compilation of OIML R-76 format test reports, digital certificates, and tamper-evident QR verification codes."
              icon={FileText}
              targetDeliverables={[
                'Standardized OIML R-76 PDF Report Generator',
                'Cryptographic hash generation for test integrity',
                'Tamper-evident QR code embedding',
                'Public verification portal endpoint'
              ]}
            />
          }
        />

        {/* Phase 5: Administration Placeholders */}
        <Route
          path="users"
          element={
            <PlaceholderPage
              title="User Directory & Role Administration"
              phase={5}
              phaseName="Phase 5: Dashboard & Repository"
              description="Administrative user provisioning, technician role assignment, and access control audit logs."
              icon={Users}
              targetDeliverables={[
                'Administrative user management portal',
                'Role promotion/demotion workflow',
                'Technician test assignment tracking',
                'Security audit logs'
              ]}
            />
          }
        />

        <Route
          path="laboratories"
          element={
            <PlaceholderPage
              title="Laboratory Facilities & Branch Network"
              phase={5}
              phaseName="Phase 5: Dashboard & Repository"
              description="Registry of verified legal metrology testing laboratories and verification centers."
              icon={Building2}
              targetDeliverables={[
                'Laboratory facility database management',
                'Jurisdictional zone assignment',
                'Environmental test conditions monitoring',
                'Standard weight sets traceability'
              ]}
            />
          }
        />

        <Route
          path="settings"
          element={
            <PlaceholderPage
              title="System Configuration & Standards Parameters"
              phase={5}
              phaseName="Phase 5: Dashboard & Repository"
              description="OIML standard threshold configurations, tolerance factors, and environment parameters."
              icon={Settings}
              targetDeliverables={[
                'MPE threshold configuration matrices',
                'Laboratory environmental tolerance bounds',
                'Backup & audit retention policies',
                'System diagnostic tools'
              ]}
            />
          }
        />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
