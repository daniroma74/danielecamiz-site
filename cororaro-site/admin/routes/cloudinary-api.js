/**
 * Cloudinary API Routes
 * Endpoint per browsing e ricerca immagini su Cloudinary
 * AGGIORNATO: Usa shared/cloudinary-manager invece di file locali
 */

require('dotenv').config();
const express = require('express');
const { requireAuth } = require('../middleware/auth');

// Funzione che ritorna subito un router, ma lo configura in modo async
module.exports = () => {
  const router = express.Router();

  // Setup async delle routes shared
  (async () => {
    try {
      // Carica dinamicamente i moduli ES6 dal shared
      const { createCloudinaryAPI } = await import('../../../shared/cloudinary-manager/api-service.js');
      const { createCloudinaryRoutes } = await import('../../../shared/cloudinary-manager/routes.js');

      // Crea l'API Cloudinary con le credenziali di questo sito
      const cloudinaryConfig = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      };

      console.log('🔧 Cloudinary API Config:', {
        cloud_name: cloudinaryConfig.cloud_name,
        api_key: cloudinaryConfig.api_key ? cloudinaryConfig.api_key.substring(0, 10) + '...' : 'MISSING'
      });

      const cloudinaryAPI = createCloudinaryAPI(cloudinaryConfig);

      // Crea il router shared con l'API configurata
      const sharedRouter = createCloudinaryRoutes(cloudinaryAPI);

      // Monta le routes shared sotto /cloudinary con auth middleware
      // Questo aggiunge requireAuth a TUTTE le routes del cloudinary router
      router.use('/cloudinary', requireAuth, sharedRouter);

      console.log('✅ Cloudinary routes loaded from shared/cloudinary-manager');
    } catch (error) {
      console.error('❌ Error loading Cloudinary routes:', error);
    }
  })();

  return router;
};
