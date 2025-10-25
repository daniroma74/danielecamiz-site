// shared/cloudinary-manager/index.js

import { CLOUDINARY_CONFIG, buildCloudinaryUrl, generateAllUrls, getFolderWithYear } from './config.js';
import { MediaAssetManager } from './database.js';

// Export tutto
export { 
  CLOUDINARY_CONFIG, 
  buildCloudinaryUrl, 
  generateAllUrls, 
  getFolderWithYear,
  MediaAssetManager 
};

// Export di convenienza per uso comune
export function getImageUrl(cloudinary_id, type = 'poster_vertical', size = 'medium') {
  const urls = generateAllUrls(cloudinary_id, type);
  return urls[size] || urls.original;
}
