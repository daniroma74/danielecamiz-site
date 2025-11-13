// shared/cloudinary-manager/routes.js
// Express routes per Cloudinary API
// Factory pattern per supportare configurazioni multi-account

import express from 'express';
import defaultCloudinaryAPI from './api-service.js';

/**
 * Crea router Express per Cloudinary API con configurazione specifica
 * @param {Object} cloudinaryAPI - API object from createCloudinaryAPI()
 * @returns {express.Router} Configured router
 */
export function createCloudinaryRoutes(cloudinaryAPI) {
  const router = express.Router();

  /**
   * GET /cloudinary/images
   * Lista immagini da Cloudinary
   * Query params:
   * - folder: folder specifico (opzionale)
   * - maxResults: numero max risultati (default: 100)
   * - nextCursor: cursor per paginazione (opzionale)
   */
  router.get('/images', async (req, res) => {
    try {
      const { folder, maxResults, nextCursor } = req.query;

      const result = await cloudinaryAPI.listImages({
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
   * GET /cloudinary/search
   * Cerca immagini
   * Query params:
   * - q: query di ricerca
   * - maxResults: numero max risultati (default: 50)
   */
  router.get('/search', async (req, res) => {
    try {
      const { q, maxResults } = req.query;

      const result = await cloudinaryAPI.searchImages({
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
   * GET /cloudinary/folders
   * Lista folders root
   */
  router.get('/folders', async (req, res) => {
    try {
      const result = await cloudinaryAPI.listFolders();
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
   * GET /cloudinary/subfolders
   * Lista sub-folders di un folder
   * Query params:
   * - path: path del folder
   */
  router.get('/subfolders', async (req, res) => {
    try {
      const { path } = req.query;
      if (!path) {
        return res.status(400).json({
          success: false,
          error: 'Path parameter required'
        });
      }
      const result = await cloudinaryAPI.listSubFolders(path);
      res.json(result);
    } catch (error) {
      console.error('Error in /cloudinary/subfolders:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /cloudinary/create-folder
   * Crea una nuova cartella
   * Body: { path: "cororaro/eventi" }
   */
  router.post('/create-folder', async (req, res) => {
    try {
      const { path } = req.body;
      if (!path) {
        return res.status(400).json({
          success: false,
          error: 'Path parameter required'
        });
      }
      const result = await cloudinaryAPI.createFolder(path);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error in /cloudinary/create-folder:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /cloudinary/move-image
   * Sposta un'immagine da una cartella all'altra
   * Body: { publicId: "cororaro/foto1", toFolder: "cororaro/eventi" }
   */
  router.post('/move-image', async (req, res) => {
    try {
      const { publicId, toFolder } = req.body;
      if (!publicId || !toFolder) {
        return res.status(400).json({
          success: false,
          error: 'publicId and toFolder parameters required'
        });
      }
      const result = await cloudinaryAPI.moveImage(publicId, toFolder);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error in /cloudinary/move-image:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

// ========================================
// ROUTER DEFAULT per retrocompatibilità
// Usa l'istanza API default (account condiviso da cms/.env)
// ========================================

const defaultRouter = createCloudinaryRoutes(defaultCloudinaryAPI);

// Export default per moduli che usano account condiviso
export default defaultRouter;
