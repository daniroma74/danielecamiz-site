// shared/cloudinary-manager/config.js

export const CLOUDINARY_CONFIG = {
  cloud_name: 'dnwhnz2xy',
  
  // Struttura cartelle su Cloudinary
  folders: {
    posters_vertical: 'danielecamiz/posters/vertical',
    posters_horizontal: 'danielecamiz/posters/horizontal', 
    gallery: 'danielecamiz/gallery',
    artists: 'danielecamiz/artists',
    news: 'danielecamiz/news',
    venues: 'danielecamiz/venues'
  },
  
  // Trasformazioni predefinite per tipo
  transformations: {
    poster_vertical: {
      thumb: 'c_fill,w_400,h_566,q_auto',
      medium: 'c_fill,w_800,h_1131,q_auto',
      large: 'c_limit,w_1600,h_2263,q_auto:best',
      print: 'c_limit,w_2480,h_3508,q_auto:best'
    },
    poster_horizontal: {
      thumb: 'c_fill,w_400,h_225,q_auto',
      medium: 'c_fill,w_800,h_450,q_auto',
      large: 'c_fill,w_1920,h_1080,q_auto:best',
      social_fb: 'c_fill,w_1200,h_630,q_auto',
      social_ig: 'c_fill,w_1080,h_1080,q_auto',
      social_tw: 'c_fill,w_1600,h_900,q_auto'
    },
    gallery_photo: {
      mini: 'c_fill,w_150,h_150,q_auto',
      thumb: 'c_fill,w_400,h_400,q_auto',
      medium: 'c_limit,w_800,h_800,q_auto',
      large: 'c_limit,w_1920,h_1080,q_auto:eco',
      full: 'c_limit,w_2560,q_auto:eco'
    },
    news_banner: {
      thumb: 'c_fill,w_400,h_200,q_auto',
      card: 'c_fill,w_600,h_300,q_auto',
      hero: 'c_fill,w_1920,h_600,q_auto:best',
      social: 'c_fill,w_1200,h_630,q_auto'
    },
    artist_photo: {
      thumb: 'c_fill,w_200,h_200,q_auto,g_face',
      medium: 'c_fill,w_400,h_400,q_auto,g_face',
      large: 'c_limit,w_800,h_800,q_auto'
    }
  },
  
  // Preset di upload per il widget
  uploadPresets: {
    poster_vertical: {
      folder: 'danielecamiz/posters/vertical/2025',
      tags: ['poster', 'vertical', 'concert'],
      transformation: { quality: 'auto:best' }
    },
    poster_horizontal: {
      folder: 'danielecamiz/posters/horizontal/2025',
      tags: ['poster', 'horizontal', 'social'],
      transformation: { quality: 'auto:best' }
    },
    gallery_photo: {
      folder: 'danielecamiz/gallery/2025',
      tags: ['gallery', 'concert', 'photo'],
      transformation: { quality: 'auto:eco' }
    }
  }
};

// Helper per costruire URL
export function buildCloudinaryUrl(publicId, transformation = '') {
  const base = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload`;
  return transformation ? `${base}/${transformation}/${publicId}` : `${base}/${publicId}`;
}

// Helper per ottenere tutte le URL di un tipo
export function generateAllUrls(publicId, type) {
  const urls = {
    original: buildCloudinaryUrl(publicId)
  };
  
  const transforms = CLOUDINARY_CONFIG.transformations[type];
  if (transforms) {
    urls.thumb = buildCloudinaryUrl(publicId, transforms.thumb);
    urls.medium = buildCloudinaryUrl(publicId, transforms.medium);
    urls.large = buildCloudinaryUrl(publicId, transforms.large || transforms.medium);
    
    // URL social se disponibili
    if (transforms.social_fb) {
      urls.social = buildCloudinaryUrl(publicId, transforms.social_fb);
    }
  }
  
  return urls;
}

// Helper per ottenere la cartella con l'anno corrente
export function getFolderWithYear(baseFolder) {
  const year = new Date().getFullYear();
  return `${baseFolder}/${year}`;
}
