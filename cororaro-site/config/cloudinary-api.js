/**
 * Cloudinary API Service - CommonJS version
 * Liste e browsing immagini da Cloudinary
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Configura Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Lista immagini da Cloudinary
 */
async function listImages(options = {}) {
  try {
    const { folder, maxResults = 100, nextCursor } = options;

    const searchOptions = {
      resource_type: 'image',
      type: 'upload',
      max_results: Math.min(maxResults, 500),
      ...(nextCursor && { next_cursor: nextCursor })
    };

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
 * Cerca immagini per nome
 */
async function searchImages(options = {}) {
  try {
    const { query, maxResults = 50 } = options;

    if (!query) {
      return listImages(options);
    }

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
 * Lista folders
 */
async function listFolders() {
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
 * Lista sub-folders
 */
async function listSubFolders(folder) {
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

module.exports = {
  cloudinary,
  listImages,
  searchImages,
  listFolders,
  listSubFolders
};
