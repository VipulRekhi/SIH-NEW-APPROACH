import { Router } from 'express';
import { InstrumentController } from '../controllers/instrument.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';
import { validateBody, createInstrumentSchema, updateInstrumentSchema, updateStatusSchema } from '../middleware/validate.middleware.js';
import { uploadSingleImage } from '../middleware/upload.middleware.js';

const router = Router();

// OCR scan intake for nameplate image (must come before /:id)
router.post('/ocr/scan', authenticateToken, uploadSingleImage, InstrumentController.scanOcr);

// File viewing endpoint (authenticated streaming)
router.get('/:id/files/:fileId/view', authenticateToken, InstrumentController.viewFile);

// Instrument CRUD
router.post('/', authenticateToken, validateBody(createInstrumentSchema), InstrumentController.createInstrument);
router.get('/', authenticateToken, InstrumentController.listInstruments);
router.get('/:id', authenticateToken, InstrumentController.getInstrument);
router.put('/:id', authenticateToken, validateBody(updateInstrumentSchema), InstrumentController.updateInstrument);
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'officer'), validateBody(updateStatusSchema), InstrumentController.updateStatus);

// File attachments for an instrument
router.post('/:id/files', authenticateToken, uploadSingleImage, InstrumentController.uploadFile);
router.delete('/:id/files/:fileId', authenticateToken, authorizeRoles('admin', 'officer'), InstrumentController.deleteFile);

export default router;
