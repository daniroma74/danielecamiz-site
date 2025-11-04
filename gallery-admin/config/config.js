import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  port: process.env.GALLERY_ADMIN_PORT || 3013,
  host: process.env.GALLERY_ADMIN_HOST || 'localhost',
  baseUrl: process.env.GALLERY_ADMIN_BASE_URL || 'http://localhost:3013',

  db: {
    path: process.env.MAIN_SQLITE_PATH || path.join(__dirname, '..', '..', 'cms', 'db', 'main.sqlite')
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    defaultFolder: 'danielecamiz/gallery'
  },

  auth: {
    username: process.env.GALLERY_ADMIN_USER || 'admin',
    password: process.env.GALLERY_ADMIN_PASS || 'admin',
    sessionSecret: process.env.SESSION_SECRET || 'gallery-admin-secret',
    jwtSecret: process.env.JWT_SECRET,
    moduleId: process.env.MODULE_ID || 'gallery-admin'
  },

  frontend: {
    siteUrl: process.env.SITE_BASE_URL || 'https://www.danielecamiz.com',
    adminHubUrl: process.env.ADMIN_HUB_URL || 'http://localhost:3100'
  },

  env: process.env.NODE_ENV || 'production'
};
