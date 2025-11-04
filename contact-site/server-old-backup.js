// contact-site/server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 4003;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', true);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares base
app.disable('x-powered-by');
app.use(compression());
app.use(cookieParser());

// Headers sicurezza minimi
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Static assets
app.use('/css', express.static(path.join(__dirname, 'public', 'css'), {
  maxAge: isProd ? '1h' : 0,
  etag: true,
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    res.setHeader('Cache-Control', isProd ? 'public, max-age=3600' : 'no-cache');
  }
}));

app.use('/js', express.static(path.join(__dirname, 'public', 'js'), {
  maxAge: isProd ? '1h' : 0,
  etag: true,
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    res.setHeader('Cache-Control', isProd ? 'public, max-age=3600' : 'no-cache');
  }
}));

app.use('/img', express.static(path.join(__dirname, 'public', 'img'), {
  maxAge: isProd ? '30d' : 0,
  etag: true
}));

// Root static (favicon, robots, ecc.)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProd ? '1d' : 0,
  etag: true
}));

// Debug logging
if (!isProd) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl} - host:${req.get('host')}`);
    next();
  });
}

/* ---------- helpers dati ---------- */

async function readJsonSafe(absPath) {
  try {
    return JSON.parse(await fs.readFile(absPath, 'utf8'));
  } catch {
    return null;
  }
}

async function loadContactData(lang = 'it') {
  const filename = `contact-${lang}.json`;
  const primary  = path.join(__dirname, 'content', filename);
  const fallback = path.join(__dirname, 'content', 'contact-it.json');
  return (await readJsonSafe(primary)) || (await readJsonSafe(fallback)) || {};
}

function pickLang(req) {
  // Priorità: forced param (se presente), path /?lng=, cookie, default
  if (req.__forcedLang === 'it' || req.__forcedLang === 'en') return req.__forcedLang;

  const q = req.query?.lng;
  if (q === 'it' || q === 'en') return q;

  const c = req.cookies?.i18next;
  if (c === 'it' || c === 'en') return c;

  return 'it';
}

function normalizeUrl(url = '') {
  const s = String(url || '').trim();
  if (!s) return '';
  if (/^(https?:)?\/\//i.test(s)) return s.startsWith('//') ? `https:${s}` : s;
  if (/^(mailto:|tel:)/i.test(s)) return s;
  return s.startsWith('/') ? s : '/' + s;
}

function normalizeLinks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(x => x && (x.url || x.text))
    .map(x => ({
      text:   x.text || '',
      url:    normalizeUrl(x.url || ''),
      icon:   x.icon || '',
      target: x.target || '_blank'
    }));
}

function prepareContactData(raw = {}, lang = 'it') {
  return {
    // Base
    avatar: raw.avatar || '/img/daniele-camiz-foto-profilo.png',
    name: raw.name || 'Daniele Camiz',
    role: raw.role || (lang === 'en'
      ? 'Conductor & Creative Director'
      : 'Direttore d’orchestra e Creative Director'),
    bio: raw.bio || '',

    // Sezioni
    highlightsTitle: raw.highlightsTitle || (lang === 'en' ? 'Highlights' : 'In evidenza'),
    highlights: normalizeLinks(raw.highlights || []),

    socialTitle: raw.socialTitle || (lang === 'en' ? 'Follow me' : 'Seguimi'),
    socialLinks: normalizeLinks(raw.socialLinks || []),

    contactTitle: raw.contactTitle || (lang === 'en' ? 'Contact' : 'Contatti'),
    contactLinks: normalizeLinks(raw.contactLinks || []),

    extraTitle: raw.extraTitle || (lang === 'en' ? 'More links' : 'Altri link'),
    extraLinks: normalizeLinks(raw.extraLinks || []),

    // Meta
    pageTitle: raw.pageTitle || (lang === 'en' ? 'Links - Daniele Camiz' : 'Link - Daniele Camiz'),
    description: raw.description || (lang === 'en'
      ? 'All my links in one place'
      : 'Tutti i miei link in un unico posto'),

    // Footer & lingua
    footerText: raw.footerText || '© 2025 Daniele Camiz',
    langToggle: {
      current: lang,
      other: lang === 'it' ? 'en' : 'it',
      label: lang === 'it' ? 'EN' : 'IT'
    }
  };
}

/* ---------- handlers ---------- */

async function renderContact(req, res, next) {
  try {
    const lang = pickLang(req);
    const raw  = await loadContactData(lang);
    const data = prepareContactData(raw, lang);

    // Memorizza lingua
    res.cookie('i18next', lang, {
      maxAge: 31536000000,
      httpOnly: false,
      sameSite: 'Lax',
      path: '/'
    });

    res.set('Content-Language', lang);
    res.render('contact', { data, lang, layout: false });
  } catch (err) {
    console.error('Error rendering contact:', err);
    next(err);
  }
}

/* ---------- routes ---------- */

app.get('/_ping', (req, res) => res.type('text/plain').send('ok'));

app.get('/', renderContact);

const withLang = (lang) => (req, res, next) => {
  req.__forcedLang = lang;
  renderContact(req, res, next);
};

app.get('/it', withLang('it'));
app.get('/en', withLang('en'));

app.get('/set-language/:lang', (req, res) => {
  const { lang } = req.params;
  if (lang === 'it' || lang === 'en') {
    res.cookie('i18next', lang, {
      maxAge: 31536000000,
      httpOnly: false,
      sameSite: 'Lax',
      path: '/'
    });
  }
  const referer = req.get('referer');
  // Se non ho referer, rimando alla home nella lingua scelta
  res.redirect(302, referer || (lang === 'en' ? '/en' : '/it'));
});

/* ---------- 404 & error ---------- */

app.use((req, res) => {
  res.status(404).type('text/plain').send('Page not found');
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).type('text/plain').send('Internal Server Error');
});

/* ---------- start ---------- */

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Contact-site listening on http://127.0.0.1:${PORT}`);
});
