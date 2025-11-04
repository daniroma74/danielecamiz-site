import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  port: process.env.CONTACT_ADMIN_PORT || 3014,
  host: process.env.CONTACT_ADMIN_HOST || 'localhost',
  baseUrl: process.env.CONTACT_ADMIN_BASE_URL || 'http://localhost:3014',

  db: {
    path: process.env.MAIN_SQLITE_PATH || path.join(__dirname, '..', '..', 'cms', 'db', 'main.sqlite')
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    defaultFolder: 'danielecamiz/contact-icons'
  },

  auth: {
    username: process.env.CONTACT_ADMIN_USER || 'admin',
    password: process.env.CONTACT_ADMIN_PASS || 'admin',
    sessionSecret: process.env.SESSION_SECRET || 'contact-admin-secret',
    jwtSecret: process.env.JWT_SECRET,
    moduleId: 'contact-admin'
  },

  hub: {
    url: process.env.ADMIN_HUB_URL || 'http://localhost:3100',
    verifyTokenEndpoint: '/api/verify-token'
  },

  frontend: {
    contactSiteUrl: process.env.CONTACT_SITE_URL || 'http://localhost:4003',
    mainSiteUrl: process.env.SITE_BASE_URL || 'https://staging.danielecamiz.com'
  },

  env: process.env.NODE_ENV || 'production'
};
