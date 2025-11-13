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
import galleryRoutes from './routes/gallery.js';
import { handleLogin, handleLogout } from './middleware/hybridAuth.js';
import { createCloudinaryAPI } from '../shared/cloudinary-manager/api-service.js';
import { createCloudinaryRoutes } from '../shared/cloudinary-manager/routes.js';

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
  res.redirect('/gallery');
});

app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login - Gallery Admin',
    error: null
  });
});

app.post('/login', handleLogin);
app.get('/logout', handleLogout);

app.use('/gallery', galleryRoutes);

// Cloudinary API routes - configured with factory pattern
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  const cloudinaryAPI = createCloudinaryAPI({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  const cloudinaryRoutes = createCloudinaryRoutes(cloudinaryAPI);
  app.use('/api/cloudinary', cloudinaryRoutes);
  console.log('✅ Cloudinary routes loaded from shared/cloudinary-manager');
} else {
  console.warn('⚠️  Cloudinary credentials not found in .env - API routes disabled');
  console.warn('⚠️  Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to enable');
}

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
      console.log(`\n✅ Gallery Admin Server Running`);
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
