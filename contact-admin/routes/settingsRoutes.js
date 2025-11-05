import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import settingsController from '../controllers/settingsController.js';

const router = express.Router();

router.use(ensureAuthenticated);

router.get('/', settingsController.showSettings);
router.post('/', settingsController.updateSettings);

export default router;
