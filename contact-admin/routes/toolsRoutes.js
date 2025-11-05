import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import toolsController from '../controllers/toolsController.js';

const router = express.Router();

router.use(ensureAuthenticated);

router.get('/qrcode', toolsController.generateQRCode);
router.get('/preview', toolsController.previewSite);
router.get('/export', toolsController.exportData);

export default router;
