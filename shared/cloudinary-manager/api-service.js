// shared/cloudinary-manager/api-service.js
// Backend API service per listare immagini da Cloudinary

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carica variabili d'ambiente dal cms/.env
dotenv.config({ path: path.join(__dirname, '../../cms/.env') });

// Configura Cloudinary con le credenziali
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnwhnz2xy',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Lista immagini da Cloudinary
 * @param {Object} options - Opzioni di ricerca
 * @param {string} options.folder - Folder da cui cercare (opzionale)
 * @param {number} options.maxResults - Numero massimo di risultati (default: 100)
 * @param {string} options.nextCursor - Cursor per paginazione (opzionale)
 * @returns {Promise<Object>} Lista di immagini
 */
export async function listImages(options = {}) {
  try {
    const { folder, maxResults = 100, nextCursor } = options;

    const searchOptions = {
      resource_type: 'image',
      type: 'upload',
      max_results: Math.min(maxResults, 500), // Cloudinary max è 500
      ...(nextCursor && { next_cursor: nextCursor })
    };

    // Se specificato un folder, filtra per quello
    if (folder) {
      searchOptions.prefix = folder;
    }

    const result = await cloudinary.api.resources(searchOptions);

    return {
      success: true,
      images: result.resources.map(img => ({
        publicId: img.public_id,
        url: img.secure_url,
        width: img.width,
        height: img.height,
        format: img.format,
        bytes: img.bytes,
        createdAt: img.created_at,
        folder: img.folder || '',
        thumbnail: cloudinary.url(img.public_id, {
          transformation: [
            { width: 200, height: 200, crop: 'fill', quality: 'auto' }
          ]
        })
      })),
      nextCursor: result.next_cursor,
      totalCount: result.total_count
    };
  } catch (error) {
    console.error('Error listing Cloudinary images:', error);
    return {
      success: false,
      error: error.message,
      images: []
    };
  }
}

/**
 * Cerca immagini per nome/tag
 * @param {Object} options - Opzioni di ricerca
 * @param {string} options.query - Query di ricerca
 * @param {number} options.maxResults - Numero massimo di risultati
 * @returns {Promise<Object>} Lista di immagini
 */
export async function searchImages(options = {}) {
  try {
    const { query, maxResults = 50 } = options;

    if (!query) {
      return listImages(options);
    }

    // Costruisci expression per search API
    const expression = `resource_type:image AND ${query}`;

    const result = await cloudinary.search
      .expression(expression)
      .sort_by('created_at', 'desc')
      .max_results(maxResults)
      .execute();

    return {
      success: true,
      images: result.resources.map(img => ({
        publicId: img.public_id,
        url: img.secure_url,
        width: img.width,
        height: img.height,
        format: img.format,
        bytes: img.bytes,
        createdAt: img.created_at,
        folder: img.folder || '',
        thumbnail: cloudinary.url(img.public_id, {
          transformation: [
            { width: 200, height: 200, crop: 'fill', quality: 'auto' }
          ]
        })
      })),
      totalCount: result.total_count
    };
  } catch (error) {
    console.error('Error searching Cloudinary images:', error);
    return {
      success: false,
      error: error.message,
      images: []
    };
  }
}

/**
 * Lista folders disponibili
 * @returns {Promise<Object>} Lista folders
 */
export async function listFolders() {
  try {
    const result = await cloudinary.api.root_folders();

    return {
      success: true,
      folders: result.folders.map(f => ({
        name: f.name,
        path: f.path
      }))
    };
  } catch (error) {
    console.error('Error listing folders:', error);
    return {
      success: false,
      error: error.message,
      folders: []
    };
  }
}

/**
 * Lista sub-folders dentro un folder
 * @param {string} folder - Path del folder
 * @returns {Promise<Object>} Lista sub-folders
 */
export async function listSubFolders(folder) {
  try {
    const result = await cloudinary.api.sub_folders(folder);

    return {
      success: true,
      folders: result.folders.map(f => ({
        name: f.name,
        path: f.path
      }))
    };
  } catch (error) {
    console.error('Error listing sub-folders:', error);
    return {
      success: false,
      error: error.message,
      folders: []
    };
  }
}

/**
 * Crea una nuova cartella su Cloudinary
 * @param {string} folderPath - Path della cartella da creare (es: "cororaro/eventi")
 * @returns {Promise<Object>} Risultato operazione
 */
export async function createFolder(folderPath) {
  try {
    if (!folderPath || folderPath.trim() === '') {
      return {
        success: false,
        error: 'Folder path is required'
      };
    }

    // Crea tutte le parent folders in sequenza se non esistono
    const parts = folderPath.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const partialPath = parts.slice(0, i).join('/');
      try {
        await cloudinary.api.create_folder(partialPath);
        console.log(`✓ Created folder: ${partialPath}`);
      } catch (error) {
        // Ignora l'errore se la folder esiste già
        if (error.http_code === 400 && error.message.includes('already exists')) {
          console.log(`✓ Folder already exists: ${partialPath}`);
        } else if (i === parts.length) {
          // Se è l'ultima cartella (quella target) e fallisce, lancia l'errore
          throw error;
        }
        // Per le parent folders, continua anche se ci sono altri errori
      }
    }

    return {
      success: true,
      message: `Folder "${folderPath}" created successfully`,
      folder: { path: folderPath, name: folderPath.split('/').pop() }
    };
  } catch (error) {
    console.error('Error creating folder:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sposta un'immagine da una cartella all'altra
 * @param {string} publicId - Public ID dell'immagine (es: "cororaro/foto1")
 * @param {string} toFolder - Cartella di destinazione (es: "cororaro/eventi")
 * @returns {Promise<Object>} Risultato operazione
 */
export async function moveImage(publicId, toFolder) {
  try {
    if (!publicId || !toFolder) {
      return {
        success: false,
        error: 'publicId and toFolder are required'
      };
    }

    // Estrae il nome del file dal public_id
    const fileName = publicId.split('/').pop();

    // Costruisce il nuovo public_id
    const newPublicId = `${toFolder}/${fileName}`;

    // Rename (che di fatto sposta l'immagine)
    const result = await cloudinary.uploader.rename(publicId, newPublicId, {
      overwrite: false,
      invalidate: true
    });

    return {
      success: true,
      message: `Image moved from "${publicId}" to "${newPublicId}"`,
      newPublicId: result.public_id,
      url: result.secure_url
    };
  } catch (error) {
    console.error('Error moving image:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  listImages,
  searchImages,
  listFolders,
  listSubFolders,
  createFolder,
  moveImage
};
