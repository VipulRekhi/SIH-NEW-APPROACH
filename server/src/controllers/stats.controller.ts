import { Response, NextFunction } from 'express';
import { query } from '../config/db.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { AppError } from '../middleware/error.middleware.js';

export class StatsController {
  static async getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }

      const role = req.user.role;
      const userId = req.user.userId;

      // Fetch user profile & lab info
      const userRes = await query(
        `SELECT u.full_name, l.name as laboratory_name
         FROM users u
         LEFT JOIN laboratories l ON u.laboratory_id = l.id
         WHERE u.id = $1`,
        [userId]
      );
      const userName = userRes.rows[0]?.full_name || req.user.email;
      const laboratoryName = userRes.rows[0]?.laboratory_name || 'Central Legal Metrology Testing Laboratory';

      if (role === 'technician') {
        const statsRes = await query(
          `SELECT
            (SELECT COUNT(*)::int FROM test_sessions WHERE created_by = $1) as my_tests,
            (SELECT COUNT(*)::int FROM test_sessions WHERE created_by = $1 AND (workflow_status = 'DRAFT' OR workflow_status = 'IN_PROGRESS')) as draft_tests,
            (SELECT COUNT(*)::int FROM test_sessions WHERE created_by = $1 AND workflow_status = 'SUBMITTED_FOR_REVIEW') as awaiting_review,
            (SELECT COUNT(*)::int FROM test_sessions WHERE created_by = $1 AND workflow_status = 'UNDER_REVIEW') as under_review,
            (SELECT COUNT(*)::int FROM test_sessions WHERE created_by = $1 AND workflow_status = 'RETURNED_FOR_CORRECTION') as returned_tests,
            (SELECT COUNT(*)::int FROM test_sessions WHERE created_by = $1 AND workflow_status IN ('APPROVED', 'OFFICIAL_REPORT_GENERATED')) as approved_tests,
            (SELECT COUNT(*)::int FROM test_sessions WHERE created_by = $1 AND (status = 'PASSED' OR status = 'PASS')) as passed_count,
            (SELECT COUNT(*)::int FROM test_sessions WHERE created_by = $1 AND (status = 'FAILED' OR status = 'FAIL')) as failed_count,
            (SELECT COUNT(*)::int FROM test_sessions WHERE created_by = $1 AND status = 'REVIEW_REQUIRED') as review_required_count`,
          [userId]
        );

        const s = statsRes.rows[0] || {};

        const recentTestsRes = await query(
          `SELECT ts.id, ts.session_number, ts.regulatory_mode, ts.status, ts.workflow_status, ts.created_at, ts.updated_at,
                  ts.test_date, ts.reviewer_comments,
                  i.manufacturer, i.model_number, i.serial_number
           FROM test_sessions ts
           JOIN instruments i ON ts.instrument_id = i.id
           WHERE ts.created_by = $1
           ORDER BY ts.updated_at DESC
           LIMIT 10`,
          [userId]
        );

        const response: ApiResponse = {
          success: true,
          data: {
            role: 'technician',
            userName,
            laboratoryName,
            technician: {
              myTests: s.my_tests ?? 0,
              draft: s.draft_tests ?? 0,
              awaitingReview: s.awaiting_review ?? 0,
              underReview: s.under_review ?? 0,
              returned: s.returned_tests ?? 0,
              approved: s.approved_tests ?? 0,
              passed: s.passed_count ?? 0,
              failed: s.failed_count ?? 0,
              reviewRequired: s.review_required_count ?? 0,
              recentTests: recentTestsRes.rows
            },
            stats: s,
            recentTests: recentTestsRes.rows
          }
        };
        res.status(200).json(response);
        return;
      }

      if (role === 'officer') {
        const statsRes = await query(
          `SELECT
            (SELECT COUNT(*)::int FROM test_sessions WHERE workflow_status = 'SUBMITTED_FOR_REVIEW') as pending_reviews,
            (SELECT COUNT(*)::int FROM test_sessions WHERE workflow_status = 'UNDER_REVIEW') as under_review,
            (SELECT COUNT(*)::int FROM test_sessions WHERE workflow_status IN ('APPROVED', 'OFFICIAL_REPORT_GENERATED')) as approved_count,
            (SELECT COUNT(*)::int FROM test_sessions WHERE workflow_status = 'REJECTED') as rejected_count,
            (SELECT COUNT(*)::int FROM test_sessions WHERE workflow_status = 'RETURNED_FOR_CORRECTION') as returned_count,
            (SELECT COUNT(*)::int FROM test_sessions WHERE (status = 'PASSED' OR status = 'PASS') AND workflow_status IN ('APPROVED', 'OFFICIAL_REPORT_GENERATED')) as passed_count,
            (SELECT COUNT(*)::int FROM test_sessions WHERE (status = 'FAILED' OR status = 'FAIL')) as failed_count,
            (SELECT COUNT(*)::int FROM test_sessions WHERE status = 'REVIEW_REQUIRED') as review_required_count,
            (SELECT COUNT(*)::int FROM reports) as total_reports`
        );

        const s = statsRes.rows[0] || {};

        const queueRes = await query(
          `SELECT ts.id, ts.session_number, ts.regulatory_mode, ts.status, ts.workflow_status,
                  ts.submitted_at, ts.created_at,
                  i.manufacturer, i.model_number, i.serial_number, i.accuracy_class,
                  u.full_name as technician_name
           FROM test_sessions ts
           JOIN instruments i ON ts.instrument_id = i.id
           JOIN users u ON ts.created_by = u.id
           WHERE ts.workflow_status IN ('SUBMITTED_FOR_REVIEW', 'UNDER_REVIEW')
           ORDER BY ts.submitted_at ASC NULLS LAST
           LIMIT 15`
        );

        const recentReportsRes = await query(
          `SELECT r.id, r.report_number, r.public_verification_id, r.overall_status, r.regulatory_mode, r.created_at,
                  i.manufacturer, i.model_number, i.serial_number,
                  u.full_name as generated_by_name
           FROM reports r
           JOIN instruments i ON r.instrument_id = i.id
           LEFT JOIN users u ON r.generated_by = u.id
           ORDER BY r.created_at DESC
           LIMIT 5`
        );

        const response: ApiResponse = {
          success: true,
          data: {
            role: 'officer',
            userName,
            laboratoryName,
            officer: {
              pendingReviews: s.pending_reviews ?? 0,
              underReview: s.under_review ?? 0,
              approved: s.approved_count ?? 0,
              rejected: s.rejected_count ?? 0,
              returned: s.returned_count ?? 0,
              passed: s.passed_count ?? 0,
              failed: s.failed_count ?? 0,
              reviewRequired: s.review_required_count ?? 0,
              reviewQueue: queueRes.rows,
              recentReports: recentReportsRes.rows
            },
            stats: s,
            reviewQueue: queueRes.rows,
            recentReports: recentReportsRes.rows
          }
        };
        res.status(200).json(response);
        return;
      }

      // ADMIN ROLE
      const statsRes = await query(
        `SELECT
          (SELECT COUNT(*)::int FROM users) as total_users,
          (SELECT COUNT(*)::int FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'technician') as technicians,
          (SELECT COUNT(*)::int FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'officer') as officers,
          (SELECT COUNT(*)::int FROM laboratories) as laboratories,
          (SELECT COUNT(*)::int FROM instruments) as instruments,
          (SELECT COUNT(*)::int FROM test_sessions) as test_sessions,
          (SELECT COUNT(*)::int FROM reports) as official_reports,
          (SELECT COUNT(*)::int FROM reports WHERE overall_status = 'PASSED' OR overall_status = 'PASS') as passed_reports,
          (SELECT COUNT(*)::int FROM reports WHERE overall_status = 'FAILED' OR overall_status = 'FAIL') as failed_reports,
          (SELECT COUNT(*)::int FROM test_sessions WHERE workflow_status = 'SUBMITTED_FOR_REVIEW') as pending_reviews`
      );

      const s = statsRes.rows[0] || {};

      const auditRes = await query(
        `SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
                u.full_name as user_name, u.email as user_email, r.name as role_name
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         LEFT JOIN roles r ON u.role_id = r.id
         ORDER BY a.created_at DESC
         LIMIT 8`
      );

      const response: ApiResponse = {
        success: true,
        data: {
          role: 'admin',
          userName,
          laboratoryName,
          admin: {
            totalUsers: s.total_users ?? 0,
            technicians: s.technicians ?? 0,
            officers: s.officers ?? 0,
            laboratories: s.laboratories ?? 0,
            instruments: s.instruments ?? 0,
            testSessions: s.test_sessions ?? 0,
            officialReports: s.official_reports ?? 0,
            passedReports: s.passed_reports ?? 0,
            failedReports: s.failed_reports ?? 0,
            pendingReviews: s.pending_reviews ?? 0,
            recentAuditLogs: auditRes.rows
          },
          stats: s,
          recentAuditLogs: auditRes.rows
        }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
