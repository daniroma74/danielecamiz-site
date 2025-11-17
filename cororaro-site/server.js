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

// Session middleware - Using memory store for reliability
// Note: Sessions will be lost on server restart, but auth is more reliable
app.use(session({
  secret: process.env.SESSION_SECRET || 'coro-raro-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: false, // Must be false for HTTP (staging)
    sameSite: 'lax' // Important for cross-page navigation
  },
  name: 'cororaro.sid' // Custom session cookie name
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
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
// ADMIN ROUTES (NO AUTH FOR NOW)
// ============================================

// Remove all admin auth - we'll rebuild from scratch
const dashboardRoutes = require('./admin/routes/dashboard')(db);
const repertoireRoutes = require('./admin/routes/repertoire')(db);
const countriesRoutes = require('./admin/routes/countries')(db);
const countriesApiRoutes = require('./admin/routes/countries-api')();
const uploadRoutes = require('./admin/routes/upload')();
const cloudinaryApiRoutes = require('./admin/routes/cloudinary-api')();
const galleryRoutes = require('./admin/routes/gallery')(db);
// New content management routes
const concertsRoutes = require('./admin/routes/concerts')(db);
const projectsRoutes = require('./admin/routes/projects')(db);
const maestriRoutes = require('./admin/routes/maestri')(db);
const settingsRoutes = require('./admin/routes/settings')(db);
const galleryImagesRoutes = require('./admin/routes/gallery-images')(db);

// Remove auth route temporarily
// app.use('/admin', authRoutes);
app.use('/admin', dashboardRoutes);
app.use('/admin', repertoireRoutes);
app.use('/admin', countriesRoutes);
app.use('/admin', countriesApiRoutes);
app.use('/admin', uploadRoutes);
app.use('/admin', cloudinaryApiRoutes);
app.use('/admin', galleryRoutes);
app.use('/admin', concertsRoutes);
app.use('/admin', projectsRoutes);
app.use('/admin', maestriRoutes);
app.use('/admin', settingsRoutes);
app.use('/admin', galleryImagesRoutes);

// Admin root redirect (no auth check)
app.get('/admin', (req, res) => {
  res.redirect('/admin/dashboard');
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

/**
 * GET /api/concerts
 * Get all published future concerts
 */
app.get('/api/concerts', (req, res) => {
  const query = `
    SELECT * FROM concerts
    WHERE is_published = 1
    ORDER BY date ASC
  `;

  db.all(query, [], (err, concerts) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ success: false, message: 'Errore database' });
    }

    res.json({
      success: true,
      data: concerts,
      count: concerts.length
    });
  });
});

/**
 * GET /api/projects
 * Get all active solidarity projects
 */
app.get('/api/projects', (req, res) => {
  const query = `
    SELECT * FROM solidarity_projects
    WHERE is_active = 1
    ORDER BY sort_order ASC, title ASC
  `;

  db.all(query, [], (err, projects) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ success: false, message: 'Errore database' });
    }

    res.json({
      success: true,
      data: projects,
      count: projects.length
    });
  });
});

/**
 * GET /api/maestri
 * Get all active maestri (directors)
 */
app.get('/api/maestri', (req, res) => {
  const query = `
    SELECT * FROM team_members
    WHERE is_active = 1
    ORDER BY sort_order ASC, full_name ASC
  `;

  db.all(query, [], (err, maestri) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ success: false, message: 'Errore database' });
    }

    res.json({
      success: true,
      data: maestri,
      total: maestri.length
    });
  });
});

/**
 * GET /api/settings
 * Get all site settings
 */
app.get('/api/settings', (req, res) => {
  db.all('SELECT * FROM site_settings', [], (err, settings) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ success: false, message: 'Errore database' });
    }

    // Convert to object
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.setting_key] = s.setting_value;
    });

    res.json({
      success: true,
      data: settingsObj
    });
  });
});

/**
 * GET /api/values
 * Get core values
 */
app.get('/api/values', (req, res) => {
  const query = `
    SELECT * FROM core_values
    WHERE is_active = 1
    ORDER BY sort_order ASC
  `;

  db.all(query, [], (err, values) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ success: false, message: 'Errore database' });
    }

    res.json({
      success: true,
      data: values
    });
  });
});

/**
 * GET /api/gallery
 * Get published gallery images
 */
app.get('/api/gallery', (req, res) => {
  const category = req.query.category;
  let query = `
    SELECT * FROM gallery_images
    WHERE is_published = 1
  `;
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY sort_order ASC, created_at DESC';

  db.all(query, params, (err, images) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ success: false, message: 'Errore database' });
    }

    res.json({
      success: true,
      data: images,
      count: images.length
    });
  });
});

/**
 * GET /api/join-info
 * Get "Unisciti a Noi" section info
 */
app.get('/api/join-info', (req, res) => {
  db.get('SELECT * FROM join_info WHERE id = 1', [], (err, info) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ success: false, message: 'Errore database' });
    }

    res.json({
      success: true,
      data: info || {}
    });
  });
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
