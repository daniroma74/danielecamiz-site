import express from 'express';
import { getPressPage } from '../controllers/pressController.js';

const router = express.Router();

// Press page (quotes + articles from i18n JSON)
router.get('/', getPressPage);

export default router;
