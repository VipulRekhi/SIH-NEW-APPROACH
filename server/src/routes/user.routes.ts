import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

// Only admin and officer can view user directory
router.get('/', authenticateToken, authorizeRoles('admin', 'officer'), UserController.getUsers);

export default router;
