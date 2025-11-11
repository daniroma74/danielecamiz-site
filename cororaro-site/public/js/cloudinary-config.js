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
    repertoire: {
      preset: 'cororaro_repertoire',
      folder: `${CORO_RARO_BASE_FOLDER}/repertoire`
    },
    concerts: {
      preset: 'cororaro_concerts',
      folder: `${CORO_RARO_BASE_FOLDER}/concerts`
    },
    gallery: {
      preset: 'cororaro_gallery',
      folder: `${CORO_RARO_BASE_FOLDER}/gallery`
    },
    news: {
      preset: 'cororaro_news',
      folder: `${CORO_RARO_BASE_FOLDER}/news`
    },
    team: {
      preset: 'cororaro_team',
      folder: `${CORO_RARO_BASE_FOLDER}/team`
    }
  };

  // Helper per ottenere config preset
  window.getCoroRaroCloudinaryConfig = function(type = 'repertoire') {
    const config = CORO_RARO_PRESETS[type] || CORO_RARO_PRESETS.repertoire;
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
