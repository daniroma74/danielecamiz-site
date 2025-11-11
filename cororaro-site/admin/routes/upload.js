/**
 * Admin Upload Routes
 * Gestisce upload immagini tramite Cloudinary
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { upload, uploadImage, deleteImage } = require('../../config/cloudinary');

module.exports = () => {
  /**
   * POST /admin/upload/image
   * Upload singola immagine
   */
  router.post('/upload/image', requireAuth, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Nessun file caricato'
        });
      }

      // Parametri opzionali dalla request
      const folder = req.body.folder || 'cororaro/general';
      const width = req.body.width ? parseInt(req.body.width) : null;
      const height = req.body.height ? parseInt(req.body.height) : null;

      // Opzioni upload
      const uploadOptions = {
        folder: folder
      };

      // Aggiungi trasformazioni se specificate
      if (width || height) {
        uploadOptions.transformation = [
          {
            width: width,
            height: height,
            crop: 'limit',
            quality: 'auto',
            fetch_format: 'auto'
          }
        ];
      }

      // Upload su Cloudinary
      const result = await uploadImage(req.file.buffer, uploadOptions);

      res.json({
        success: true,
        message: 'Immagine caricata con successo',
        data: result
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Errore durante l\'upload: ' + error.message
      });
    }
  });

  /**
   * POST /admin/upload/images
   * Upload multiple immagini
   */
  router.post('/upload/images', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nessun file caricato'
        });
      }

      const folder = req.body.folder || 'cororaro/general';
      const uploadPromises = req.files.map(file =>
        uploadImage(file.buffer, { folder })
      );

      const results = await Promise.all(uploadPromises);

      res.json({
        success: true,
        message: `${results.length} immagini caricate con successo`,
        data: results
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Errore durante l\'upload: ' + error.message
      });
    }
  });

  /**
   * DELETE /admin/upload/image
   * Elimina immagine da Cloudinary
   */
  router.delete('/upload/image', requireAuth, async (req, res) => {
    try {
      const { publicId } = req.body;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: 'Public ID mancante'
        });
      }

      const result = await deleteImage(publicId);

      res.json({
        success: true,
        message: 'Immagine eliminata',
        data: result
      });

    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Errore durante l\'eliminazione: ' + error.message
      });
    }
  });

  return router;
};
