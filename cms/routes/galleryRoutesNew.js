import express from 'express';
import {
  getGalleryOverview,
  getGalleryCollectionsByType,
  getGalleryCollectionDetail
} from '../controllers/galleryControllerNew.js';

const router = express.Router();

// Gallery overview (photo/video/audio sections)
router.get('/', getGalleryOverview);

// Collection detail (must be before type-only route)
router.get('/photos/:slug', (req, res) => {
  req.params.type = 'photos';
  return getGalleryCollectionDetail(req, res);
});
router.get('/videos/:slug', (req, res) => {
  req.params.type = 'videos';
  return getGalleryCollectionDetail(req, res);
});
router.get('/audio/:slug', (req, res) => {
  req.params.type = 'audio';
  return getGalleryCollectionDetail(req, res);
});

// Collections by type (photos, videos, audio)
router.get('/photos', (req, res) => {
  req.params.type = 'photos';
  return getGalleryCollectionsByType(req, res);
});
router.get('/videos', (req, res) => {
  req.params.type = 'videos';
  return getGalleryCollectionsByType(req, res);
});
router.get('/audio', (req, res) => {
  req.params.type = 'audio';
  return getGalleryCollectionsByType(req, res);
});

export default router;
