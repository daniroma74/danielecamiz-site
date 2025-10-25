import express from 'express';
import { getGalleryPage } from '../controllers/galleryController.js';

const router = express.Router();

// Gallery page (SSR from i18n JSON)
router.get('/', getGalleryPage);

export default router;
