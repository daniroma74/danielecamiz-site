import express from 'express';
import { getPressPage } from '../controllers/pressController.js';
import { attachLabels } from '../middleware/contentLoader.js';

const router = express.Router();

// Press page (quotes + articles from i18n JSON)
router.get('/', attachLabels(['press', 'global']), getPressPage);

export default router;
