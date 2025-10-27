import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  port: process.env.PRESS_ADMIN_PORT || 3012,
  host: process.env.PRESS_ADMIN_HOST || 'localhost',
  baseUrl: process.env.PRESS_ADMIN_BASE_URL || 'http://localhost:3012',

  db: {
    path: process.env.MAIN_SQLITE_PATH || path.join(__dirname, '..', '..', 'cms', 'db', 'main.sqlite')
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  auth: {
    username: process.env.PRESS_ADMIN_USER || 'admin',
    password: process.env.PRESS_ADMIN_PASS || 'admin',
    sessionSecret: process.env.SESSION_SECRET || 'press-admin-secret',
    jwtSecret: process.env.JWT_SECRET,
    moduleId: process.env.MODULE_ID || 'press-admin'
  },

  frontend: {
    siteUrl: process.env.SITE_BASE_URL || 'https://staging.danielecamiz.com',
    adminHubUrl: process.env.ADMIN_HUB_URL || 'http://localhost:3100'
  },

  env: process.env.NODE_ENV || 'staging'
};
