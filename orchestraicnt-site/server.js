/**
 * Orchestra ICNT - Simple Express Server
 * Serves static files and handles basic routing
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3100;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes

/**
 * Contact form endpoint
 * TODO: Implement email sending (nodemailer, sendgrid, etc.)
 */
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

  // For now, just return success
  res.json({
    success: true,
    message: 'Messaggio inviato con successo'
  });
});

/**
 * Newsletter subscription endpoint
 * TODO: Implement newsletter service integration
 */
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

// Start server
app.listen(PORT, () => {
  console.log(`
  🎵 Orchestra ICNT Website
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Server running on port ${PORT}

  🌐 Local:   http://localhost:${PORT}
  📁 Public:  ${path.join(__dirname, 'public')}

  Press Ctrl+C to stop
  `);
});

module.exports = app;
