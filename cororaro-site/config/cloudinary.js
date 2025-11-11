/**
 * Cloudinary Configuration & Upload Helpers
 * Gestisce upload immagini su Cloudinary
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer memory storage (non salviamo file su disco)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accetta solo immagini
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo file immagine sono permessi!'), false);
    }
  }
});

/**
 * Upload immagine su Cloudinary
 * @param {Buffer} fileBuffer - Buffer del file
 * @param {Object} options - Opzioni upload
 * @returns {Promise<Object>} - Risultato upload con URL
 */
async function uploadImage(fileBuffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'cororaro',
      transformation: options.transformation || [
        { quality: 'auto', fetch_format: 'auto' }
      ],
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Elimina immagine da Cloudinary
 * @param {String} publicId - Public ID dell'immagine
 * @returns {Promise<Object>} - Risultato eliminazione
 */
async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Errore eliminazione immagine:', error);
    throw error;
  }
}

/**
 * Genera URL ottimizzato con trasformazioni
 * @param {String} publicId - Public ID dell'immagine
 * @param {Object} options - Opzioni trasformazione
 * @returns {String} - URL trasformato
 */
function getOptimizedUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    ...options
  });
}

/**
 * Genera thumbnail
 * @param {String} publicId - Public ID dell'immagine
 * @param {Number} size - Dimensione del thumbnail (default 200)
 * @returns {String} - URL thumbnail
 */
function getThumbnailUrl(publicId, size = 200) {
  return cloudinary.url(publicId, {
    transformation: [
      { width: size, height: size, crop: 'fill', gravity: 'auto' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  });
}

module.exports = {
  cloudinary,
  upload,
  uploadImage,
  deleteImage,
  getOptimizedUrl,
  getThumbnailUrl
};
