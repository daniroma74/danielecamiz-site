/**
 * Orchestra ICNT - Express Server with Admin Panel
 */

// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const { initLocalDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 4012;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname));

// Trust proxy (siamo dietro Nginx)
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (per autenticazione admin)
app.use(session({
  secret: process.env.SESSION_SECRET || 'orchestra-icnt-default-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 ore
    sameSite: 'lax' // Protezione CSRF
  }
}));

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve /shared directory (for CloudinaryManager, TinyMCE, etc.)
app.use('/shared', express.static(path.join(__dirname, '../shared'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const adminRoutes = require('./admin/routes/admin');
const apiRoutes = require('./routes/api');
const mediaRoutes = require('./routes/media');

app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api/media', mediaRoutes);

// TODO: Add cloudinary routes after fixing export
// const cloudinaryRoutes = require('../shared/cloudinary-manager/routes');
// app.use('/admin/cloudinary', cloudinaryRoutes);

// Contact form endpoint (existing)
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'Tutti i campi sono obbligatori'
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email non valida'
    });
  }

  // TODO: Send email
  console.log('Contact form submission:', { name, email, subject, message });

  res.json({
    success: true,
    message: 'Messaggio inviato con successo'
  });
});

// Newsletter subscription endpoint (existing)
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email richiesta'
    });
  }

  // TODO: Add to newsletter service
  console.log('Newsletter subscription:', email);

  res.json({
    success: true,
    message: 'Iscrizione completata'
  });
});

// Catch-all route - serve index.html for client-side routing
app.get('*', (req, res) => {
  // Exclude admin routes
  if (req.path.startsWith('/admin')) {
    return res.status(404).send('Admin route not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Errore del server'
  });
});

// Initialize database and start server
async function start() {
  try {
    console.log('[Database] Initializing...');
    await initLocalDB();
    console.log('[Database] ✅ Initialized successfully');

    app.listen(PORT, () => {
      console.log(`
  🎵 Orchestra ICNT Website
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Server running on port ${PORT}

  🌐 Public:  http://localhost:${PORT}
  🔧 Admin:   http://localhost:${PORT}/admin

  Press Ctrl+C to stop
      `);
    });
  } catch (error) {
    console.error('[Server] Fatal error during initialization:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
