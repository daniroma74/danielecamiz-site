/**
 * Cloudinary Configuration for Coro Raro
 * Sovrascrive le configurazioni del cloudinary-manager shared
 */

// Override del CLOUD_NAME per Coro Raro
(function() {
  const CORO_RARO_CLOUD_NAME = 'dbxmszhyl';
  const CORO_RARO_BASE_FOLDER = 'cororaro';

  // Preset Cloudinary per Coro Raro
  const CORO_RARO_PRESETS = {
    concerts: {
      preset: 'cororaro_concerts',
      folder: `${CORO_RARO_BASE_FOLDER}/concerts`
    },
    gallery: {
      preset: 'cororaro_gallery',
      folder: `${CORO_RARO_BASE_FOLDER}/gallery`
    },
    team: {
      preset: 'cororaro_team',
      folder: `${CORO_RARO_BASE_FOLDER}/team`
    },
    general: {
      preset: 'cororaro_general',
      folder: `${CORO_RARO_BASE_FOLDER}/general`
    }
  };

  // Helper per ottenere config preset
  window.getCoroRaroCloudinaryConfig = function(type = 'general') {
    const config = CORO_RARO_PRESETS[type] || CORO_RARO_PRESETS.general;
    return {
      cloudName: CORO_RARO_CLOUD_NAME,
      ...config
    };
  };

  // Configura CloudinaryManager quando viene caricato
  document.addEventListener('DOMContentLoaded', function() {
    // Se CloudinaryManager è disponibile, override del CLOUD_NAME
    if (window.CloudinaryManager) {
      console.log('✅ CloudinaryManager configurato per Coro Raro:', CORO_RARO_CLOUD_NAME);
    }
  });

  // Esponi configurazione globalmente
  window.CORO_RARO_CLOUDINARY = {
    CLOUD_NAME: CORO_RARO_CLOUD_NAME,
    BASE_FOLDER: CORO_RARO_BASE_FOLDER,
    PRESETS: CORO_RARO_PRESETS
  };
})();
