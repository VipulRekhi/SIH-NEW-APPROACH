import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/dashboard', authenticateToken, StatsController.getDashboardStats);

export default router;
