/**
 * Cloudinary API Routes
 * Endpoint per browsing e ricerca immagini su Cloudinary
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listImages, searchImages, listFolders, listSubFolders } = require('../../config/cloudinary-api');

module.exports = () => {
  /**
   * GET /admin/cloudinary/images
   * Lista immagini da Cloudinary
   */
  router.get('/cloudinary/images', requireAuth, async (req, res) => {
    try {
      const { folder, maxResults, nextCursor } = req.query;

      const result = await listImages({
        folder,
        maxResults: maxResults ? parseInt(maxResults) : 100,
        nextCursor
      });

      res.json(result);
    } catch (error) {
      console.error('Error in /cloudinary/images:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /admin/cloudinary/search
   * Cerca immagini
   */
  router.get('/cloudinary/search', requireAuth, async (req, res) => {
    try {
      const { q, maxResults } = req.query;

      const result = await searchImages({
        query: q,
        maxResults: maxResults ? parseInt(maxResults) : 50
      });

      res.json(result);
    } catch (error) {
      console.error('Error in /cloudinary/search:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /admin/cloudinary/folders
   * Lista folders root
   */
  router.get('/cloudinary/folders', requireAuth, async (req, res) => {
    try {
      const result = await listFolders();
      res.json(result);
    } catch (error) {
      console.error('Error in /cloudinary/folders:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /admin/cloudinary/subfolders
   * Lista sub-folders
   */
  router.get('/cloudinary/subfolders', requireAuth, async (req, res) => {
    try {
      const { path } = req.query;
      if (!path) {
        return res.status(400).json({
          success: false,
          error: 'Path parameter required'
        });
      }
      const result = await listSubFolders(path);
      res.json(result);
    } catch (error) {
      console.error('Error in /cloudinary/subfolders:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
