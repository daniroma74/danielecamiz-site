// shared/js/cloudinary-widget.js
// Unified Cloudinary Widget with Media Library support
// Permette di uploadare nuove immagini O selezionare da quelle esistenti

/**
 * Crea un widget Cloudinary unificato
 * @param {Object} config - Configurazione del widget
 * @param {string} config.cloudName - Nome account Cloudinary
 * @param {string} config.uploadPreset - Upload preset
 * @param {string} config.folder - Cartella di destinazione
 * @param {Function} onSuccess - Callback chiamata quando l'immagine è selezionata/caricata
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Object} Widget instance
 */
function createUnifiedCloudinaryWidget(config, onSuccess, options = {}) {
  const defaultOptions = {
    multiple: false,
    maxFileSize: 10000000, // 10MB
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    cropping: false,
    showSkipCropButton: true,
    showPoweredBy: false,
    ...options
  };

  const widgetConfig = {
    cloudName: config.cloudName,
    uploadPreset: config.uploadPreset,
    folder: config.folder,

    // Sorgenti per UPLOAD di nuove immagini + ricerca immagini esistenti
    sources: [
      'local',        // Upload da computer
      'url',          // Upload da URL
      'camera',       // Scatta foto (mobile)
      'image_search'  // Cerca tra le immagini esistenti su Cloudinary
    ],

    // Abilita ricerca per immagini già caricate
    search: {
      by_rights: false
    },

    multiple: defaultOptions.multiple,
    maxFileSize: defaultOptions.maxFileSize,
    resourceType: 'image',
    clientAllowedFormats: defaultOptions.clientAllowedFormats,
    cropping: defaultOptions.cropping,
    showSkipCropButton: defaultOptions.showSkipCropButton,
    showPoweredBy: defaultOptions.showPoweredBy,

    // Testi in italiano
    text: {
      'local.browse': 'Sfoglia',
      'local.dd_title_single': 'Trascina un\'immagine qui',
      'local.dd_title_multi': 'Trascina le immagini qui',
      'menu.files': 'Carica da Computer',
      'menu.web': 'Carica da URL',
      'menu.camera': 'Scatta Foto',
      'menu.media_library': 'Seleziona da Cloudinary',
      'or': 'oppure'
    }
  };

  const widget = cloudinary.createUploadWidget(widgetConfig, (error, result) => {
    if (error) {
      console.error('Cloudinary widget error:', error);
      if (typeof showNotification === 'function') {
        showNotification('Errore durante l\'upload: ' + error.message, 'error');
      }
      return;
    }

    // Gestisce sia upload che selezione da Media Library
    if (result && result.event === 'success') {
      const imageData = {
        publicId: result.info.public_id,
        url: result.info.secure_url,
        width: result.info.width,
        height: result.info.height,
        format: result.info.format,
        bytes: result.info.bytes,
        thumbnail: result.info.thumbnail_url
      };

      if (onSuccess) {
        onSuccess(imageData, result);
      }
    }

    // Event per debug (opzionale)
    if (result && result.event === 'queues-end') {
      console.log('✅ Cloudinary upload/selection complete');
    }
  });

  return widget;
}

/**
 * Helper per aprire il widget e ottenere un'immagine
 * @param {Object} config - Configurazione del widget
 * @param {Function} onSuccess - Callback con l'immagine selezionata
 */
function openCloudinaryPicker(config, onSuccess, options = {}) {
  const widget = createUnifiedCloudinaryWidget(config, onSuccess, options);
  widget.open();
  return widget;
}

// Export per uso globale
if (typeof window !== 'undefined') {
  window.createUnifiedCloudinaryWidget = createUnifiedCloudinaryWidget;
  window.openCloudinaryPicker = openCloudinaryPicker;
}
