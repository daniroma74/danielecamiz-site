// cororaro-landing/server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import cookieParser from 'cookie-parser';

import { connectDB } from './config/database.js';
import { PORT, SESSION_SECRET } from './config/constants.js';
import { routeByDomain } from './middleware/routing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware (per admin)
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 giorni
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

// View engine
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, '..', 'shared')
]);
app.set('view engine', 'ejs');

// Database
const db = connectDB();
app.locals.db = db;

// Trust proxy (per Nginx)
app.set('trust proxy', 1);

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Host: ${req.get('host')}`);
  next();
});

// ============================================
// ROUTING BY DOMAIN
// ============================================
app.use(routeByDomain);

// ============================================
// ROUTES
// ============================================

// Import routes
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import bookingRoutes from './routes/bookings.js';

// Admin routes (solo su landing-admin.cororaro.it o localhost)
app.use((req, res, next) => {
  if (req.isCoroAdmin) {
    return adminRoutes(req, res, next);
  }
  next();
});

// Public routes (solo su [slug].cororaro.it)
app.use((req, res, next) => {
  if (!req.isCoroAdmin) {
    return publicRoutes(req, res, next);
  }
  next();
});

// API bookings (disponibile su tutti i domini)
app.use('/api/bookings', bookingRoutes);

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    message: 'Errore del server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`
========================================
🎵 Coro Raro Landing System [Multi-Domain]
========================================
Porta: ${PORT}
Database: cororaro.db (condiviso)
Admin: https://landing-admin.cororaro.it
Landing: https://[slug].cororaro.it
Locale: http://localhost:${PORT}/admin/landing
========================================
  `);
});

export default app;
