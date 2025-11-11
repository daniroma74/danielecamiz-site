/**
 * Coro Raro - Express Server
 * Serves static files and handles contact form API
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3120;

// Database connection
const DB_PATH = path.join(__dirname, 'db', 'cororaro.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Database connected');
  }
});

// View Engine Setup for Admin
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'admin/views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Session middleware
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, 'db')
  }),
  secret: process.env.SESSION_SECRET || 'coro-raro-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Serve shared resources (cloudinary, tinymce, etc)
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ============================================
// ADMIN ROUTES
// ============================================

const authRoutes = require('./admin/routes/auth')(db);
const dashboardRoutes = require('./admin/routes/dashboard')(db);
const repertoireRoutes = require('./admin/routes/repertoire')(db);
const countriesRoutes = require('./admin/routes/countries')(db);
const uploadRoutes = require('./admin/routes/upload')();
const cloudinaryApiRoutes = require('./admin/routes/cloudinary-api')();

app.use('/admin', authRoutes);
app.use('/admin', dashboardRoutes);
app.use('/admin', repertoireRoutes);
app.use('/admin', countriesRoutes);
app.use('/admin', uploadRoutes);
app.use('/admin', cloudinaryApiRoutes);

// Admin root redirect
app.get('/admin', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin/login');
  }
});

// ============================================
// API ROUTES
// ============================================

/**
 * POST /api/contact
 * Contact form submission
 */
app.post('/api/contact', (req, res) => {
  const { name, email, phone, message } = req.body;

  // Validation
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Nome, email e messaggio sono obbligatori'
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

  // TODO: Send email via nodemailer, sendgrid, etc.
  console.log('📧 Contact form submission:');
  console.log({
    name,
    email,
    phone: phone || 'N/A',
    message,
    timestamp: new Date().toISOString()
  });

  // Success response
  res.json({
    success: true,
    message: 'Grazie per il tuo messaggio! Ti contatteremo presto.'
  });
});

/**
 * POST /api/newsletter
 * Newsletter signup (optional)
 */
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email richiesta'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email non valida'
    });
  }

  // TODO: Add to newsletter service
  console.log('📬 Newsletter signup:', email);

  res.json({
    success: true,
    message: 'Iscrizione completata!'
  });
});

/**
 * GET /api/repertoire
 * Get all repertoire grouped by country
 */
app.get('/api/repertoire', (req, res) => {
  const query = `
    SELECT
      c.id as country_id,
      c.code,
      c.flag,
      c.name as country,
      c.lat,
      c.lng,
      c.color,
      r.id as song_id,
      r.title,
      r.description,
      r.audio_url,
      r.sheet_music_url,
      r.lyrics,
      r.language,
      r.difficulty,
      r.duration_seconds
    FROM countries c
    LEFT JOIN repertoire r ON c.id = r.country_id AND r.is_active = 1
    ORDER BY c.name, r.sort_order, r.title
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Errore durante il recupero del repertorio'
      });
    }

    // Group songs by country
    const countries = {};
    rows.forEach(row => {
      const countryCode = row.code;

      if (!countries[countryCode]) {
        countries[countryCode] = {
          code: row.code,
          flag: row.flag,
          country: row.country,
          lat: row.lat,
          lng: row.lng,
          color: row.color,
          songs: []
        };
      }

      if (row.song_id) {
        countries[countryCode].songs.push({
          id: row.song_id,
          title: row.title,
          description: row.description,
          audioUrl: row.audio_url,
          sheetMusicUrl: row.sheet_music_url,
          lyrics: row.lyrics,
          language: row.language,
          difficulty: row.difficulty,
          durationSeconds: row.duration_seconds
        });
      }
    });

    // Convert to array
    const repertoire = Object.values(countries);

    res.json({
      success: true,
      data: repertoire,
      count: repertoire.length
    });
  });
});

/**
 * GET /api/repertoire/:countryCode
 * Get repertoire for a specific country
 */
app.get('/api/repertoire/:countryCode', (req, res) => {
  const { countryCode } = req.params;

  const query = `
    SELECT
      c.id as country_id,
      c.code,
      c.flag,
      c.name as country,
      c.lat,
      c.lng,
      c.color,
      r.id as song_id,
      r.title,
      r.description,
      r.audio_url,
      r.sheet_music_url,
      r.lyrics,
      r.language,
      r.difficulty,
      r.duration_seconds
    FROM countries c
    LEFT JOIN repertoire r ON c.id = r.country_id AND r.is_active = 1
    WHERE c.code = ?
    ORDER BY r.sort_order, r.title
  `;

  db.all(query, [countryCode.toUpperCase()], (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Errore durante il recupero del repertorio'
      });
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paese non trovato'
      });
    }

    const country = {
      code: rows[0].code,
      flag: rows[0].flag,
      country: rows[0].country,
      lat: rows[0].lat,
      lng: rows[0].lng,
      color: rows[0].color,
      songs: rows
        .filter(row => row.song_id)
        .map(row => ({
          id: row.song_id,
          title: row.title,
          description: row.description,
          audioUrl: row.audio_url,
          sheetMusicUrl: row.sheet_music_url,
          lyrics: row.lyrics,
          language: row.language,
          difficulty: row.difficulty,
          durationSeconds: row.duration_seconds
        }))
    };

    res.json({
      success: true,
      data: country
    });
  });
});

// ============================================
// SPA FALLBACK (only for frontend, not admin or api)
// ============================================

app.get('*', (req, res, next) => {
  // Skip admin and API routes
  if (req.path.startsWith('/admin') || req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Errore del server'
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
  🎵 Coro Raro Website
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Server running on port ${PORT}

  🌐 Local:   http://localhost:${PORT}
  📁 Public:  ${path.join(__dirname, 'public')}

  Environment: ${process.env.NODE_ENV || 'development'}

  Press Ctrl+C to stop
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
