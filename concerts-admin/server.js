// concerts-admin/server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import adminRoutes from './routes/admin.js';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import { ensureAuthenticated } from './middleware/simpleAuth.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 Cookie parser for auth (NO express-session needed!)
app.use(cookieParser());

// IMPORTANTE: Servi cartella /shared dal livello superiore
app.use('/shared', express.static(path.join(__dirname, '../shared'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// File statici /public
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Variabili globali template
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.eventsAdminUrl = process.env.EVENTS_ADMIN_URL || 'https://events-admin.danielecamiz.com';
  res.locals.stagingUrl = process.env.STAGING_URL || 'https://www.danielecamiz.com';
  next();
});

// Auth routes (NO authentication required - must be BEFORE protected routes)
app.use('/auth', authRoutes);

// API routes (public)
app.use('/api', apiRoutes);

// Admin routes (🔐 Protected by SimpleAuth)
app.use('/admin', ensureAuthenticated, adminRoutes);

// Redirect root
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🎵 Concerts Admin running on http://localhost:${PORT}`);
  console.log(`📁 Serving /shared from: ${path.join(__dirname, '../shared')}`);
});