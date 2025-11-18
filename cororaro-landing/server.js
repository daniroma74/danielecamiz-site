// cororaro-landing/server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import cookieParser from 'cookie-parser';

import { connectDB } from './config/database.js';
import { PORT, SESSION_SECRET } from './config/constants.js';

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

// CORS per API
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
// ROUTES
// ============================================

// Import routes
import adminRoutes from './routes/admin.js';
import bookingRoutes from './routes/bookings.js';

// Mount routes
app.use('/', adminRoutes);
app.use('/api/bookings', bookingRoutes);

// Home/Test route
app.get('/', (req, res) => {
  res.send(`
    <h1>🎵 Coro Raro Landing System</h1>
    <ul>
      <li><a href="/admin/landing">Admin Landing Editor</a></li>
      <li><a href="/test-landing">Test Landing Page</a></li>
    </ul>
  `);
});

// Test landing page
app.get('/test-landing', async (req, res) => {
  try {
    const concerts = db.prepare(`
      SELECT c.*,
             (SELECT COUNT(*) FROM concert_bookings WHERE concert_id = c.id AND status = 'confirmed') as booking_count
      FROM concerts c
      WHERE is_published = 1
      ORDER BY date DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      message: 'Coro Raro Landing System is running!',
      concerts: concerts,
      database: 'Connected to cororaro.db'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Public landing page by slug
app.get('/:slug', async (req, res) => {
  try {
    const { Concert } = await import('./models/Concert.js');
    const concert = Concert.findBySlug(db, req.params.slug);

    if (!concert || !concert.is_published) {
      return res.status(404).send('Landing page non trovata');
    }

    // Parse gallery
    if (concert.gallery_images) {
      try {
        concert.gallery_images = JSON.parse(concert.gallery_images);
      } catch (e) {
        concert.gallery_images = [];
      }
    }

    res.render('pages/landing', {
      title: concert.hero_title || concert.title,
      concert
    });
  } catch (error) {
    console.error('Error loading landing:', error);
    res.status(500).send('Errore nel caricamento della landing page');
  }
});

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
🎵 Coro Raro Landing System
========================================
Porta: ${PORT}
Database: cororaro.db (condiviso)
Admin: http://localhost:${PORT}/admin/landing
Test: http://localhost:${PORT}/test-landing
========================================
  `);
});

export default app;
