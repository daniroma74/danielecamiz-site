// shared/cloudinary-manager/routes.js
// Express routes per Cloudinary API

import express from 'express';
import { listImages, searchImages, listFolders, listSubFolders, createFolder, moveImage } from './api-service.js';

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
 * GET /cloudinary/search
 * Cerca immagini
 * Query params:
 * - q: query di ricerca
 * - maxResults: numero max risultati (default: 50)
 */
router.get('/search', async (req, res) => {
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
 * GET /cloudinary/folders
 * Lista folders root
 */
router.get('/folders', async (req, res) => {
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
    const result = await createFolder(path);

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
    const result = await moveImage(publicId, toFolder);

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

export default router;
