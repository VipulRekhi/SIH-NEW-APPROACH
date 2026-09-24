import { Router } from 'express';
import { LaboratoryController } from '../controllers/laboratory.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';
import { validateBody, createLabSchema } from '../middleware/validate.middleware.js';

const router = Router();

// Any authenticated user can view laboratories
router.get('/', authenticateToken, LaboratoryController.getLaboratories);

// Only admin can create laboratories
router.post('/', authenticateToken, authorizeRoles('admin'), validateBody(createLabSchema), LaboratoryController.createLaboratory);

export default router;
