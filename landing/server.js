// landing/server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import { connectDB } from './config/database.js';
import { PORT } from './config/constants.js';

import { routeByDomain } from './middleware/routing.js';
import { requireAuth } from './middleware/jwtAuth.js';
import { errorHandler } from './middleware/errorHandler.js';

import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const db = connectDB();
app.locals.db = db;

app.set('trust proxy', 1);

// Routing by domain
app.use(routeByDomain);

// 🔐 JWT AUTHENTICATION - Protects admin routes only (public landing pages unaffected)
app.use(requireAuth);

// Routes admin (solo su events-admin.danielecamiz.com)
app.use((req, res, next) => {
  if (req.isEventAdmin) {
    return adminRoutes(req, res, next);
  }
  next();
});

// Routes pubbliche (solo su [slug].danielecamiz.com)
app.use((req, res, next) => {
  if (!req.isEventAdmin) {
    return publicRoutes(req, res, next);
  }
  next();
});

// API disponibili su tutti i domini
app.use('/api', apiRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`
    ========================================
    Landing Server Multi-Domain [REFACTORED]
    ========================================
    Porta: ${PORT}
    Admin: https://events-admin.danielecamiz.com
    Landing: https://[slug-evento].danielecamiz.com
    Email: MailService condiviso
    ========================================
  `);
});

export default app;