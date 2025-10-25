// newsletter-service/server.js
// Server con route manage-subscription nel posto giusto + mini-auth per /admin

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import adminRoutes from './routes/admin.js';
import apiRoutes from './routes/api.js';

// === JWT AUTHENTICATION: Admin Hub Integration ===
import { requireAuth } from './middleware/jwtAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.NEWSLETTER_PORT || 3006;

// Database connection
const db = connectDB();
app.locals.db = db;

// Middleware base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser for JWT authentication
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// Static files
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Servi la cartella shared
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ====== ROUTES PUBBLICHE PRIMA DELLE ROUTES PROTETTE ======

// 🎯 PAGINA GESTIONE ISCRIZIONE - ROUTE PUBBLICA
app.get('/newsletter/manage', (req, res) => {
  const email = req.query.email || '';
  res.render('pages/manage-subscription', { email });
});

// Alias compatibilità
app.get('/manage', (req, res) => {
  res.redirect('/newsletter/manage' + (req.query.email ? '?email=' + req.query.email : ''));
});
app.get('/gestione-iscrizione', (req, res) => {
  res.redirect('/newsletter/manage' + (req.query.email ? '?email=' + req.query.email : ''));
});

// ====== API ROUTES (pubbliche) ======
app.use('/api', apiRoutes);

// ====== LOGOUT ROUTE ======
app.get('/logout', (req, res) => {
  res.clearCookie('auth_token', { domain: `.${process.env.MAIN_DOMAIN || 'danielecamiz.com'}` });
  const adminHubUrl = process.env.ADMIN_HUB_URL || 'http://localhost:3100';
  res.redirect(`${adminHubUrl}/auth/logout`);
});

// ====== ADMIN ROUTES (🔐 PROTECTED BY JWT) ======
app.use('/admin', requireAuth, adminRoutes);

// ====== ROOT REDIRECT ======
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// ====== ERROR HANDLING ======
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  if (req.path.startsWith('/api')) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }

  try {
    return res.status(500).render('pages/error', {
      error: err.message || 'Errore interno del server'
    });
  } catch (e) {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>500 - Errore</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f4f4f4; }
          h1 { color: #ff6b6b; }
          a { display:inline-block; margin-top:20px; padding:10px 20px; background:#667eea; color:white; text-decoration:none; border-radius:5px; }
        </style>
      </head>
      <body>
        <h1>500 - Errore interno del server</h1>
        <p>${err.message || 'Qualcosa è andato storto.'}</p>
        <a href="/admin">Vai alla Dashboard</a>
      </body>
      </html>
    `);
  }
});

// 404 handler - DEVE ESSERE L'ULTIMO
app.use((req, res) => {
  console.log('404 - Not found:', req.path);

  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint non trovato'
    });
  }

  try {
    return res.status(404).render('pages/404', { path: req.path });
  } catch (e) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>404 - Pagina non trovata</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f4f4f4; }
          h1 { color: #ff6b6b; }
          a { display:inline-block; margin-top:20px; padding:10px 20px; background:#667eea; color:white; text-decoration:none; border-radius:5px; }
        </style>
      </head>
      <body>
        <h1>404 - Pagina non trovata</h1>
        <p>La pagina ${req.path} non esiste</p>
        <a href="/admin">Vai alla Dashboard</a>
      </body>
      </html>
    `);
  }
});

// ====== START SERVER ======
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════╗
║      📧 NEWSLETTER SERVICE AVVIATO     ║
╠════════════════════════════════════════╣
║                                        ║
║  Admin Panel:                          ║
║  http://localhost:${PORT}/admin         ║
║                                        ║
║  Gestione Iscrizione:                  ║
║  http://localhost:${PORT}/newsletter/manage ║
║                                        ║
║  API Subscribe:                        ║
║  POST http://localhost:${PORT}/api/subscribe ║
║                                        ║
╚════════════════════════════════════════╝
  `);
});

// ====== GRACEFUL SHUTDOWN ======
process.on('SIGTERM', () => {
  console.log('\n📪 Shutting down gracefully...');
  server.close(() => {
    db.close();
    console.log('✅ Newsletter service stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📪 Shutting down...');
  server.close(() => {
    db.close();
    console.log('✅ Newsletter service stopped');
    process.exit(0);
  });
});

export default app;
