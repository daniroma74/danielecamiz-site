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
    secure: false, // FIXED: Allow cookies on HTTP for localhost testing
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

// Cloudinary routes (loaded dynamically via import() to support ES modules)
// Will be mounted at /admin/cloudinary/* after server starts

// Contact form endpoint with email sending
app.post('/api/contact', async (req, res) => {
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

  // Send email via sendmail
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail'
    });

    const recipientEmail = process.env.CONTACT_EMAIL || 'orchestraicnt@danielecamiz.com';

    // Send email to Orchestra ICNT
    await transporter.sendMail({
      from: `"Orchestra ICNT Website" <noreply@danielecamiz.com>`,
      replyTo: email,
      to: recipientEmail,
      subject: `[Orchestra ICNT] ${subject}`,
      text: `Nome: ${name}\nEmail: ${email}\n\nMessaggio:\n${message}`,
      html: `
        <h3>Nuovo messaggio dal form contatti</h3>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Oggetto:</strong> ${subject}</p>
        <hr>
        <p><strong>Messaggio:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    });

    console.log('[Contact] Email sent successfully to:', recipientEmail);

    // Send confirmation copy to sender
    await transporter.sendMail({
      from: `"Orchestra ICNT" <noreply@danielecamiz.com>`,
      to: email,
      subject: `Conferma ricezione messaggio - Orchestra ICNT`,
      text: `Gentile ${name},\n\nGrazie per averci contattato! Abbiamo ricevuto il tuo messaggio e ti risponderemo al più presto.\n\nEcco una copia del messaggio che hai inviato:\n\nOggetto: ${subject}\nMessaggio:\n${message}\n\n---\nOrchestra ICNT\nwww.orchestraicnt.danielecamiz.com`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Orchestra ICNT</h2>
          <p>Gentile <strong>${name}</strong>,</p>
          <p>Grazie per averci contattato! Abbiamo ricevuto il tuo messaggio e ti risponderemo al più presto.</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Copia del tuo messaggio:</h3>
            <p><strong>Oggetto:</strong> ${subject}</p>
            <p><strong>Messaggio:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>

          <p style="color: #666; font-size: 14px;">
            Orchestra ICNT<br>
            <a href="https://orchestraicnt.danielecamiz.com">www.orchestraicnt.danielecamiz.com</a>
          </p>
        </div>
      `
    });

    console.log('[Contact] Confirmation email sent to:', email);

    res.json({
      success: true,
      message: 'Messaggio inviato con successo'
    });
  } catch (error) {
    console.error('[Contact] Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio del messaggio. Riprova più tardi.'
    });
  }
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

    // Load Cloudinary routes (ES module, requires dynamic import)
    // IMPORTANT: Must be loaded BEFORE catch-all route to avoid HTML response
    try {
      const cloudinaryModule = await import('../shared/cloudinary-manager/routes.js');
      const cloudinaryRoutes = cloudinaryModule.default;
      app.use('/api/cloudinary', cloudinaryRoutes);
      console.log('[Cloudinary] ✅ Routes loaded at /api/cloudinary');
    } catch (error) {
      console.warn('[Cloudinary] ⚠️  Routes not loaded:', error.message);
    }

    // Catch-all route - serve index.html for client-side routing
    // MUST be AFTER all API routes to avoid catching API calls
    app.get('*', (req, res) => {
      // Exclude admin routes
      if (req.path.startsWith('/admin')) {
        return res.status(404).send('Admin route not found');
      }
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

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
