// cms/routes/pressKitRoutes.js
import express from 'express';
import { getPressKitPage } from '../controllers/pressKitController.js';
import { attachLabels } from '../middleware/contentLoader.js';

const router = express.Router();

// Press-Kit page (EPK - Electronic Press Kit)
router.get('/', attachLabels(['press-kit', 'global']), getPressKitPage);

export default router;
