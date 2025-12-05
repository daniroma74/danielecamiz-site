import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config/config.js';
import { ensureSchema } from './utils/database.js';
import pressRoutes from './routes/press.js';
import { ensureAuthenticated, handleLogin, handleLogout } from './middleware/hybridAuth.js';
import cloudinaryRoutes from '../shared/cloudinary-manager/routes.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.config = config;
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

app.get('/', (req, res) => {
  // Se c'è un token JWT nella query, passalo alla route press
  const token = req.query.token;
  if (token) {
    res.redirect(`/press?token=${token}`);
  } else {
    res.redirect('/press');
  }
});

app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login - Press Admin',
    error: null
  });
});

app.post('/login', handleLogin);
app.get('/logout', handleLogout);

app.use('/press', pressRoutes);

// Cloudinary API routes (uses shared credentials from cms/.env)
// Mounted at /api/cloudinary to match CloudinaryManager client expectations
app.use('/api/cloudinary', ensureAuthenticated, cloudinaryRoutes);

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    error: err.message,
    stack: config.env === 'development' ? err.stack : undefined
  });
});

async function startServer() {
  try {
    await ensureSchema();

    app.listen(config.port, () => {
      console.log(`\n✅ Press Admin Server Running`);
      console.log(`📍 Environment: ${config.env}`);
      console.log(`🌐 URL: ${config.baseUrl}`);
      console.log(`🔌 Port: ${config.port}`);
      console.log(`📁 Database: ${config.db.path}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
