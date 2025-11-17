import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export const PORT = process.env.PORT || 3121;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const SESSION_SECRET = process.env.SESSION_SECRET || 'cororaro-landing-secret';
export const BASE_DOMAIN = process.env.BASE_DOMAIN || 'cororaro.it';
export const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'cororaro-site', 'db', 'cororaro.db');

export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Coro Raro <noreply@cororaro.it>';
