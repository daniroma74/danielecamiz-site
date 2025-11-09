/**
 * Coro Raro - Express Server
 * Serves static files and handles contact form API
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3120;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ============================================
// SPA FALLBACK
// ============================================

app.get('*', (req, res) => {
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
