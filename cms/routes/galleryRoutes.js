import express from 'express';
import { getGalleryPage, getGalleryPhotosPage, getGalleryVideosPage } from '../controllers/galleryController.js';

const router = express.Router();

// Subgalleries (must be before root)
router.get('/photos', getGalleryPhotosPage);
router.get('/videos', getGalleryVideosPage);

// Gallery home (overview of all galleries)
router.get('/', getGalleryPage);

export default router;
