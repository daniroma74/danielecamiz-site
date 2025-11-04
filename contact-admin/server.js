// Contact Admin - Pannello amministrativo per gestione link contact site
// Gestisce settings, links, sections con scheduling e analytics

import express from 'express';
import session from 'express-session';
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
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", config.hub.url]
    }
  }
}));

// Session management
app.use(session({
  secret: config.auth.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.env === 'production',
    httpOnly: true,
    maxAge: 3600000 // 1 hour
  }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

// Import routes (dynamic import)
const setupRoutes = async () => {
  const { default: authRoutes } = await import('./routes/authRoutes.js');
  const { default: dashboardRoutes } = await import('./routes/dashboardRoutes.js');
  const { default: settingsRoutes } = await import('./routes/settingsRoutes.js');
  const { default: linksRoutes } = await import('./routes/linksRoutes.js');
  const { default: sectionsRoutes } = await import('./routes/sectionsRoutes.js');
  const { default: toolsRoutes } = await import('./routes/toolsRoutes.js');

  // Public routes
  app.use('/auth', authRoutes);

  // Protected routes (auth middleware will be in routes)
  app.use('/dashboard', dashboardRoutes);
  app.use('/settings', settingsRoutes);
  app.use('/links', linksRoutes);
  app.use('/sections', sectionsRoutes);
  app.use('/tools', toolsRoutes);

  // Root redirect
  app.get('/', (req, res) => {
    if (req.session && req.session.authenticated) {
      res.redirect('/dashboard');
    } else {
      res.redirect('/auth/login');
    }
  });

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
