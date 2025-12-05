// Cloudinary uploader for fetched images
import fetch from 'node-fetch';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnwhnz2xy',
  api_key: process.env.CLOUDINARY_API_KEY || '475369637192245',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'M5oAuFh6ArdI8KT-A13bcKyvao0'
});

/**
 * Upload an image from URL to Cloudinary
 * @param {string} imageUrl - URL of the image to upload
 * @param {string} folder - Cloudinary folder (default: danielecamiz/press)
 * @returns {Promise<string>} - Cloudinary public_id
 */
export async function uploadImageToCloudinary(imageUrl, folder = 'danielecamiz/press') {
  try {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    console.log('[Cloudinary] Uploading image from:', imageUrl);

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: folder,
      resource_type: 'image',
      overwrite: false,
      unique_filename: true
    });

    console.log('[Cloudinary] Upload successful:', result.public_id);
    return result.public_id;
  } catch (error) {
    console.error('[Cloudinary] Upload failed:', error.message);
    throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
  }
}
