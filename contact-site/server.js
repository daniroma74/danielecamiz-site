// contact-site/server.js
// Refactored with DB integration + analytics tracking

import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 4003;
const isProd = process.env.NODE_ENV === 'production';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');
const HUB_ANALYTICS_URL = process.env.HUB_ANALYTICS_URL || 'http://localhost:3100/api/analytics/track';

// Database connection
let db;
try {
  db = new Database(DB_PATH, { readonly: true });
  db.pragma('journal_mode = WAL');
  console.log(`✅ Database connected: ${DB_PATH}`);
} catch (error) {
  console.error('⚠️  Database connection failed, will use JSON fallback:', error.message);
}

app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

app.use(compression());
app.use(cookieParser());
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Static assets
app.use('/css', express.static(path.join(__dirname, 'public', 'css'), {
  maxAge: isProd ? '1h' : 0, etag: true
}));

app.use('/js', express.static(path.join(__dirname, 'public', 'js'), {
  maxAge: isProd ? '1h' : 0, etag: true
}));

app.use('/img', express.static(path.join(__dirname, 'public', 'img'), {
  maxAge: isProd ? '30d' : 0, etag: true
}));

// ============================================
// DATA LOADING (DB + JSON FALLBACK)
// ============================================

// Load data from database
async function loadDataFromDB(lang) {
  if (!db) return null;

  try {
    // Get settings
    const settings = db.prepare('SELECT * FROM contact_settings WHERE id = 1').get();
    if (!settings) return null;

    // Get sections
    const sections = db.prepare(`
      SELECT * FROM contact_sections
      WHERE visible = 1
      ORDER BY order_index
    `).all();

    // Get active links (respects scheduling + visibility)
    const links = db.prepare(`
      SELECT * FROM view_active_contact_links
      ORDER BY category, order_index
    `).all();

    // Get groups for Linktree-style grouping
    const groups = db.prepare(`
      SELECT * FROM link_groups
      WHERE visible = 1
      ORDER BY order_index
    `).all();

    // Helper: Auto-detect YouTube thumbnail from URL
    // Supports: /watch?v=, /live/, youtu.be/, /embed/, /v/
    function getYouTubeThumbnail(url) {
      if (!url) return null;
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          // Use hqdefault (480x360) instead of maxresdefault - exists for ALL videos
          const thumbUrl = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
          console.log(`[Thumbnail] YouTube → ${thumbUrl}`);
          return thumbUrl;
        }
      }
      console.log(`[Thumbnail] No match for: ${url.substring(0, 60)}`);
      return null;
    }

    // Group links by category
    const linksByCategory = {};
    const highlightGroupsMap = {}; // Temporary map for grouping

    links.forEach(link => {
      if (!linksByCategory[link.category]) {
        linksByCategory[link.category] = [];
      }

      // Auto-detect YouTube thumbnail (philosophy: just paste YouTube link, thumbnail appears!)
      const autoThumbnail = getYouTubeThumbnail(link.url);

      // Find group from group_id
      let linkGroup = null;
      if (link.group_id) {
        linkGroup = groups.find(g => g.id === link.group_id);
      }

      const linkData = {
        text: lang === 'en' ? link.title_en : link.title_it,
        url: link.url,
        icon: link.icon,
        target: link.target,
        badge: link.badge_text,
        badgeColor: link.badge_color,
        thumbnail: autoThumbnail || link.thumbnail_url, // Auto-detect first, fallback to DB
        groupId: linkGroup ? linkGroup.id : null,
        groupName: linkGroup ? linkGroup.name : null
      };

      linksByCategory[link.category].push(linkData);

      // If highlight, also add to highlightGroups (Linktree-style)
      if (link.category === 'highlight') {
        const groupKey = linkGroup ? linkGroup.id : '';
        if (!highlightGroupsMap[groupKey]) {
          highlightGroupsMap[groupKey] = {
            id: groupKey,
            name: linkGroup ? linkGroup.name : null,
            order_index: linkGroup ? linkGroup.order_index : -1,
            links: []
          };
        }
        highlightGroupsMap[groupKey].links.push(linkData);
      }
    });

    // Convert highlightGroups map to sorted array
    const highlightGroups = Object.values(highlightGroupsMap)
      .sort((a, b) => (a.order_index || -1) - (b.order_index || -1));

    // Build data object
    const data = {
      name: settings.name,
      role: lang === 'en' ? settings.role_en : settings.role_it,
      bio: lang === 'en' ? settings.bio_en : settings.bio_it,
      avatar: settings.avatar_url,
      footerText: lang === 'en' ? settings.footer_text_en : settings.footer_text_it,
      pageTitle: `Links - ${settings.name}`,
      description: lang === 'en'
        ? 'All my links in one place - Contacts, social media, projects and news'
        : 'Tutti i miei link in un unico posto - Contatti, social, progetti e news',
      highlightGroups // NEW: Grouped highlights for Linktree-style display
    };

    // Add sections and links
    sections.forEach(section => {
      const categoryId = section.id;
      // Map 'highlights' (plural in sections) to 'highlight' (singular in links)
      const linksCategoryId = categoryId === 'highlights' ? 'highlight' : categoryId;
      const titleKey = `${categoryId}Title`;
      const linksKey = categoryId === 'highlight' || categoryId === 'highlights' ? 'highlights' : `${categoryId}Links`;

      data[titleKey] = lang === 'en' ? section.title_en : section.title_it;
      data[linksKey] = linksByCategory[linksCategoryId] || [];
    });

    return data;
  } catch (error) {
    console.error('Error loading data from DB:', error);
    return null;
  }
}

// Load data from JSON (fallback)
async function loadDataFromJSON(lang) {
  try {
    const filename = `contact-${lang}.json`;
    const filepath = path.join(__dirname, 'content', filename);
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading JSON (${lang}):`, error.message);
    return null;
  }
}

// Main data loader (DB first, then JSON fallback)
async function loadContactData(lang) {
  // Try DB first
  const dbData = await loadDataFromDB(lang);
  if (dbData) {
    console.log(`✅ Data loaded from DB (${lang})`);
    return dbData;
  }

  // Fallback to JSON
  console.log(`⚠️  Falling back to JSON (${lang})`);
  const jsonData = await loadDataFromJSON(lang);
  return jsonData || {};
}

// ============================================
// LANGUAGE DETECTION
// ============================================

function pickLang(req) {
  if (req.__forcedLang === 'it' || req.__forcedLang === 'en') return req.__forcedLang;
  const q = req.query?.lng;
  if (q === 'it' || q === 'en') return q;
  const c = req.cookies?.i18next;
  if (c === 'it' || c === 'en') return c;
  return 'it';
}

// ============================================
// ROUTES
// ============================================

// Main render function
async function renderContact(req, res) {
  try {
    const lang = pickLang(req);
    const data = await loadContactData(lang);

    // Set language cookie
    res.cookie('i18next', lang, {
      maxAge: 31536000000, // 1 year
      httpOnly: false,
      sameSite: 'lax'
    });

    res.setHeader('Content-Language', lang);

    // Prevent caching so editor changes appear immediately
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Language toggle
    const otherLang = lang === 'it' ? 'en' : 'it';
    data.langToggle = {
      current: lang,
      other: otherLang,
      label: lang === 'it' ? 'EN' : 'IT'
    };

    res.render('contact', {
      data,
      lang,
      layout: false,
      hubAnalyticsUrl: HUB_ANALYTICS_URL
    });
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).send('Error loading page');
  }
}

// Routes
app.get('/', (req, res) => renderContact(req, res));

app.get('/it', (req, res) => {
  req.__forcedLang = 'it';
  renderContact(req, res);
});

app.get('/en', (req, res) => {
  req.__forcedLang = 'en';
  renderContact(req, res);
});

app.get('/set-language/:lang', (req, res) => {
  const lang = req.params.lang === 'en' ? 'en' : 'it';
  res.cookie('i18next', lang, {
    maxAge: 31536000000,
    httpOnly: false,
    sameSite: 'lax'
  });
  res.redirect('/');
});

// Health check
app.get('/_ping', (req, res) => res.send('ok'));

// 404
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Contact Site running on http://localhost:${PORT}`);
  console.log(`   Environment: ${isProd ? 'production' : 'development'}`);
  console.log(`   Database: ${DB_PATH}`);
  console.log(`   Analytics: ${HUB_ANALYTICS_URL}`);
});
