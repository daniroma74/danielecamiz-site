import express from 'express';
import { ensureAuthenticated } from '../middleware/hybridAuth.js';
import dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

// Require authentication for all dashboard routes
router.use(ensureAuthenticated);

router.get('/', dashboardController.showDashboard);

export default router;
