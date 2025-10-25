// cms/routes/videoRoutes.js
import express from 'express';
import { getVideoPage } from '../controllers/videoController.js';

const router = express.Router();

// GET /video
router.get('/', getVideoPage);

export default router;
