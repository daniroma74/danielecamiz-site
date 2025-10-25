// news-admin/server.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carica .env LOCALE (in news-admin/)
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config/config.js';
import { ensureSchema } from './utils/database.js';
import newsRoutes from './routes/news.js';
import { ensureAuthenticated, handleLogin, handleLogout } from './middleware/simpleAuth.js';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

// Template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Locals globali
app.use((req, res, next) => {
  res.locals.config = config;
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Login routes (NON protette)
app.get('/login', (req, res) => {
  res.render('login', {
    error: req.query.error || null,
    expired: req.query.expired || null,
    redirect: req.query.redirect || '/news'
  });
});

app.post('/login', handleLogin);

app.get('/logout', handleLogout);

// Routes protette
app.get('/', (req, res) => {
  res.redirect('/news');
});

app.use('/news', newsRoutes);

// Health check (non protetto)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'news-admin',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[NEWS-ADMIN Error]:', err);
  res.status(500).json({ 
    error: 'Errore interno del server',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404
app.use((req, res) => {
  res.status(404).send('Pagina non trovata');
});

// Inizializzazione
async function start() {
  try {
    // Verifica e crea schema se necessario
    await ensureSchema();
    
    app.listen(config.port, config.host, () => {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║     NEWS-ADMIN Module Started        ║');
      console.log('╚════════════════════════════════════════╝');
      console.log(`\n🌐 Server:     http://${config.host}:${config.port}`);
      console.log(`📰 Dashboard:  http://${config.host}:${config.port}/news`);
      console.log(`💾 Database:   ${config.dbPath}`);
      console.log(`☁️  Cloudinary: ${config.cloudinary.cloudName || 'non configurato'}`);
      console.log(`\n🔐 Login:`);
      console.log(`   Username: ${process.env.NEWS_ADMIN_USER || 'admin'}`);
      console.log(`   Password: ${process.env.NEWS_ADMIN_PASS || 'changeme123'}`);
      console.log('\n✅ Ready to manage news!\n');
    });
  } catch (error) {
    console.error('[NEWS-ADMIN] Errore avvio:', error);
    process.exit(1);
  }
}

start();