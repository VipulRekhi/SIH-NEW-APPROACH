import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

// All admin routes strictly require 'admin' role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// User Management
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.patch('/users/:id/status', AdminController.toggleUserStatus);
router.patch('/users/:id/role', AdminController.updateUserRole);

// Laboratory Management
router.get('/laboratories', AdminController.getLaboratories);
router.post('/laboratories', AdminController.createLaboratory);
router.put('/laboratories/:id', AdminController.updateLaboratory);

// Audit Logs
router.get('/audit-logs', AdminController.getAuditLogs);

// System Diagnostics & Stats
router.get('/system-stats', AdminController.getSystemStats);
router.post('/reset-demo-data', AdminController.resetDemoData);

export default router;
