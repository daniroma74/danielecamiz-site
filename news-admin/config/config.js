// news-admin/config/config.js
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  // Server
  port: process.env.NEWS_ADMIN_PORT || 3005,
  host: process.env.NEWS_ADMIN_HOST || 'localhost',
  baseUrl: process.env.NEWS_ADMIN_BASE_URL || 'https://news-admin.danielecamiz.com',
  
  // Database (condiviso)
  dbPath: process.env.MAIN_SQLITE_PATH || path.join(__dirname, '..', '..', 'cms', 'db', 'main.sqlite'),
  
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folders: {
      covers: 'news/covers',
      galleries: 'news/galleries'
    }
  },
  
  // Social Media
  social: {
    facebook: {
      systemUserToken: process.env.FB_SYSTEM_USER_TOKEN,
      targetPageIds: (process.env.FB_TARGET_PAGE_IDS || '').split(',').filter(Boolean)
    },
    linkedin: {
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
      apiVersion: process.env.LINKEDIN_API_VERSION || '202508'
    },
    threads: {
      accessToken: process.env.THREADS_ACCESS_TOKEN,
      userId: process.env.THREADS_USER_ID
    }
  },
  
  // Frontend sites
  frontendUrl: process.env.SITE_BASE_URL || 'https://staging.danielecamiz.com',
  contactSiteUrl: process.env.CONTACT_SITE_URL || 'https://contact.danielecamiz.com',
  
  // Admin Hub
  adminHubUrl: process.env.ADMIN_HUB_URL || 'http://localhost:3002',
  
  // JWT per auth condivisa
  jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET,
  jwtExpiry: '24h',
  
  // Defaults
  defaults: {
    author: 'Daniele Camiz',
    language: 'it',
    categories: ['news', 'concerti', 'premi', 'collaborazioni', 'altro']
  }
};

export default config;