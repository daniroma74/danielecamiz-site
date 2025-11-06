// Contact Admin - Pannello amministrativo per gestione link contact site
// Gestisce settings, links, sections con scheduling e analytics

import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware base
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"], // Permette onclick inline
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", config.hub.url]
    }
  }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));
// Mount contact-site public files for visual editor preview
app.use('/contact-public', express.static(path.join(__dirname, '..', 'contact-site', 'public')));

// Import routes (dynamic import)
const setupRoutes = async () => {
  const { ensureAuthenticated, handleLogin, handleLogout } = await import('./middleware/hybridAuth.js');
  const { default: settingsRoutes } = await import('./routes/settingsRoutes.js');
  const { default: editorRoutes } = await import('./routes/editorRoutes.js');

  // Auth routes (like bio-admin)
  app.get('/login', (req, res) => {
    res.render('auth/login', { title: 'Login - Contact Admin', error: null });
  });
  app.post('/login', handleLogin);
  app.get('/logout', handleLogout);

  // Root redirect - go to dashboard
  app.get('/', ensureAuthenticated, (req, res) => {
    res.redirect('/dashboard');
  });

  // Dashboard with quick links
  app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard', { title: 'Dashboard - Contact Admin' });
  });

  // Protected routes
  app.use('/settings', settingsRoutes);
  app.use('/editor', editorRoutes); // Visual Editor (main interface)

  // Health check
  app.get('/_ping', (req, res) => res.send('ok'));

  // 404
  app.use((req, res) => {
    res.status(404).render('errors/404', { title: 'Page Not Found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      error: config.env === 'development' ? err : {}
    });
  });
};

// Start server
const startServer = async () => {
  await setupRoutes();

  app.listen(config.port, config.host, () => {
    console.log(`✅ Contact Admin running on ${config.host}:${config.port}`);
    console.log(`   Environment: ${config.env}`);
    console.log(`   Database: ${config.db.path}`);
    console.log(`   Hub: ${config.hub.url}`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
