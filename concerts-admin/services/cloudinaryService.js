// concerts-admin/services/cloudinaryService.js
// Servizio Cloudinary integrato con SHARED

import { 
  CLOUDINARY_CONFIG, 
  buildCloudinaryUrl, 
  generateAllUrls 
} from '../../shared/cloudinary-manager/config.js';

import { MediaAssetManager } from '../../shared/cloudinary-manager/database.js';

class CloudinaryService {
  constructor() {
    this.config = CLOUDINARY_CONFIG;
    this.mediaManager = new MediaAssetManager();
  }

  /**
   * Genera URL per poster verticale di concerto (ratio 3:4)
   * @param {string} cloudinaryId - ID Cloudinary del poster
   * @param {string} size - 'small'|'medium'|'large'|'original'
   * @returns {string} URL completo con trasformazioni
   */
  getConcertPosterUrl(cloudinaryId, size = 'medium') {
    if (!cloudinaryId || cloudinaryId === '') {
      return this.getPlaceholderUrl('poster');
    }
    const urls = generateAllUrls(cloudinaryId, 'poster_vertical');
    return urls[size] || urls.original;
  }

  /**
   * Genera URL per poster orizzontale (ratio 16:9 per landing/social)
   * @param {string} cloudinaryId
   * @param {string} size
   * @returns {string}
   */
  getConcertHorizontalPosterUrl(cloudinaryId, size = 'medium') {
    if (!cloudinaryId || cloudinaryId === '') {
      return this.getPlaceholderUrl('banner');
    }
    const urls = generateAllUrls(cloudinaryId, 'poster_horizontal');
    return urls[size] || urls.original;
  }

  /**
   * Genera tutte le dimensioni per un poster
   * @param {string} cloudinaryId
   * @returns {Object} { small, medium, large, original }
   */
  getPosterUrls(cloudinaryId) {
    if (!cloudinaryId) {
      return {
        small: this.getPlaceholderUrl('poster'),
        medium: this.getPlaceholderUrl('poster'),
        large: this.getPlaceholderUrl('poster'),
        original: this.getPlaceholderUrl('poster')
      };
    }
    return generateAllUrls(cloudinaryId, 'poster_vertical');
  }

  /**
   * Genera URL per immagini gallery
   * @param {string} cloudinaryId
   * @param {string} size
   * @returns {string}
   */
  getGalleryImageUrl(cloudinaryId, size = 'medium') {
    if (!cloudinaryId) {
      return this.getPlaceholderUrl('gallery');
    }
    const urls = generateAllUrls(cloudinaryId, 'gallery');
    return urls[size] || urls.original;
  }

  /**
   * URL placeholder quando manca immagine
   * @param {string} type - 'poster'|'banner'|'gallery'|'avatar'
   * @returns {string}
   */
  getPlaceholderUrl(type = 'poster') {
    const placeholders = {
      poster: 'https://via.placeholder.com/400x533/1a1a1a/d6b25e?text=Poster+Verticale',
      banner: 'https://via.placeholder.com/1200x675/1a1a1a/d6b25e?text=Poster+Orizzontale',
      gallery: 'https://via.placeholder.com/800x600/1a1a1a/d6b25e?text=Immagine',
      avatar: 'https://via.placeholder.com/200x200/1a1a1a/d6b25e?text=Avatar'
    };
    return placeholders[type] || placeholders.poster;
  }

  /**
   * Build URL custom con trasformazioni specifiche
   * @param {string} cloudinaryId
   * @param {Object} transformations - { width, height, crop, quality, ... }
   * @returns {string}
   */
  buildCustomUrl(cloudinaryId, transformations = {}) {
    return buildCloudinaryUrl(cloudinaryId, transformations);
  }

  /**
   * Verifica se un cloudinary_id è valido
   * @param {string} cloudinaryId
   * @returns {boolean}
   */
  isValidId(cloudinaryId) {
    return cloudinaryId && 
           typeof cloudinaryId === 'string' && 
           cloudinaryId.trim().length > 0 &&
           !cloudinaryId.includes('placeholder');
  }

  /**
   * Estrae public_id da URL completo Cloudinary
   * @param {string} url
   * @returns {string|null}
   */
  extractPublicIdFromUrl(url) {
    if (!url) return null;
    
    const match = url.match(/\/v\d+\/(.+?)(\.\w+)?$/);
    return match ? match[1] : null;
  }

  /**
   * Salva riferimento media nel database
   * @param {Object} mediaData
   * @returns {Promise<number>} ID del media salvato
   */
  async saveMediaReference(mediaData) {
    return await this.mediaManager.saveAsset(mediaData);
  }

  /**
   * Collega media a entità (concerto, post, etc)
   * @param {number} mediaId
   * @param {string} entityType - 'concert'|'post'|'event'
   * @param {number} entityId
   * @param {string} role - 'poster'|'gallery'|'thumbnail'
   */
  async linkMediaToEntity(mediaId, entityType, entityId, role = 'poster') {
    return await this.mediaManager.linkToEntity(mediaId, entityType, entityId, role);
  }

  /**
   * Recupera media collegati a un concerto
   * @param {number} concertId
   * @returns {Promise<Array>}
   */
  async getConcertMedia(concertId) {
    return await this.mediaManager.getEntityMedia('concert', concertId);
  }

  /**
   * Config per upload widget frontend
   * @param {string} preset - 'poster_vertical_unsigned'|'gallery_unsigned'
   * @param {string} folder - Cartella Cloudinary
   * @param {boolean} enableCrop - Abilita crop (default: false)
   * @returns {Object}
   */
  getUploadConfig(preset = 'poster_vertical_unsigned', folder = null, enableCrop = false) {
    const config = {
      cloudName: this.config.cloudName,
      uploadPreset: preset,
      folder: folder || this.config.folders[preset] || 'danielecamiz/concerts',
      multiple: false,
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      maxFileSize: 5000000, // 5MB
      sources: ['local', 'url', 'camera'],
      styles: {
        palette: {
          window: "#1a1a1a",
          windowBorder: "#d6b25e",
          tabIcon: "#d6b25e",
          menuIcons: "#f1f1f1",
          textDark: "#000000",
          textLight: "#f1f1f1",
          link: "#d6b25e",
          action: "#d6b25e",
          inProgress: "#7aa2ff",
          complete: "#52d273",
          error: "#ff6b6b"
        }
      }
    };
    
    // Aggiungi crop solo se richiesto
    if (enableCrop) {
      config.cropping = true;
      config.showSkipCropButton = true;
      if (preset === 'poster_vertical_unsigned') {
        config.croppingAspectRatio = 3/4;
      } else if (preset === 'poster_horizontal_unsigned') {
        config.croppingAspectRatio = 16/9;
      }
    }
    
    return config;
  }
}

// Export singleton
const cloudinaryService = new CloudinaryService();
export default cloudinaryService;