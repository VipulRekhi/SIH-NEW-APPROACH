import { Router } from 'express';
import { TestSessionController } from '../controllers/test-session.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Test Type and Rule Registries
router.get('/test-types', authenticateToken, TestSessionController.getTestTypes);
router.get('/test-rule-registry', authenticateToken, TestSessionController.getRuleRegistry);

// Test Sessions CRUD
router.post('/test-sessions', authenticateToken, TestSessionController.createSession);
router.get('/test-sessions', authenticateToken, TestSessionController.listSessions);
router.get('/test-sessions/:id', authenticateToken, TestSessionController.getSession);
router.put('/test-sessions/:id', authenticateToken, TestSessionController.updateSession);
router.delete('/test-sessions/:id', authenticateToken, TestSessionController.deleteSession);
router.patch('/test-sessions/:id/status', authenticateToken, TestSessionController.updateStatus);
router.post('/test-sessions/:id/plan', authenticateToken, TestSessionController.generatePlan);
router.post('/test-sessions/:id/evaluate', authenticateToken, TestSessionController.evaluateSession);
router.post('/test-sessions/:id/applicability', authenticateToken, TestSessionController.evaluateApplicability);

// Phase 5: Role-based Workflow Lifecycle
router.post('/test-sessions/:id/submit', authenticateToken, TestSessionController.submitSession);
router.post('/test-sessions/:id/start-review', authenticateToken, TestSessionController.startReview);
router.post('/test-sessions/:id/return', authenticateToken, TestSessionController.returnSession);
router.post('/test-sessions/:id/reject', authenticateToken, TestSessionController.rejectSession);
router.post('/test-sessions/:id/approve', authenticateToken, TestSessionController.approveSession);

// Test Observations & Calculations
router.get('/test-sessions/:id/tests/:testId/observations', authenticateToken, TestSessionController.getObservations);
router.post('/test-sessions/:id/tests/:testId/observations', authenticateToken, TestSessionController.addObservation);
router.delete('/test-sessions/:id/tests/:testId/observations/:obsId', authenticateToken, TestSessionController.deleteObservation);
router.post('/test-sessions/:id/tests/:testId/calculate', authenticateToken, TestSessionController.calculateTest);
router.delete('/test-sessions/:id/tests/:testId', authenticateToken, TestSessionController.deleteTestData);

export default router;
