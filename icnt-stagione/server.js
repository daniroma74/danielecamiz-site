import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import ejsLayouts from 'express-ejs-layouts';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import tz from 'dayjs/plugin/timezone.js';
import 'dayjs/locale/it.js';
import Database from 'better-sqlite3';
import QRCode from 'qrcode';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.locale('it');

const TZ = 'Europe/Rome';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === ENV Configuration ===
const PORT = Number(process.env.PORT || 3026);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');
const SEASON_CODE = process.env.SEASON_CODE || '2025-26';
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || '';
const DETAIL_HOST_PATTERN = process.env.DETAIL_HOST_PATTERN || '{slug}.danielecamiz.com';
const DETAIL_MAP = parseDetailMap(process.env.DETAIL_MAP || '');
const DEFAULT_START_TIME = process.env.DEFAULT_START_TIME || '20:00';

// === App Configuration ===
const app = express();
app.disable('x-powered-by');

// Security headers with CSP for PWA
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com', 'https://www.google-analytics.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://www.google-analytics.com', 'https://analytics.google.com'],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:']
    }
  }
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ------------------------- EMERGENCY RESET ------------------------- */
app.get('/__reset', (req, res) => {
  res.set('Clear-Site-Data', '"cache", "storage", "cookies"');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.status(200).send('OK — dati del sito cancellati. Ricarica la pagina.');
});

// === Cookie Consent Check Middleware ===
app.use((req, res, next) => {
  res.locals.cookieConsent = req.cookies.cookieConsent || false;
  res.locals.GA_MEASUREMENT_ID = GA_MEASUREMENT_ID;
  next();
});

/* ------------------------- DOWNLOAD LOCANDINA (MOBILE-FRIENDLY) -------------------------
   Usa questa rotta per far funzionare il “Salva/Scarica” anche su iOS/Android.
   Il bottone in pagina deve puntare a:  href="/dl/poster"
----------------------------------------------------------------------------- */
const POSTER_FILE = path.join(__dirname, 'public', 'img', 'poster', 'poster-1200x1710.webp');
const POSTER_NAME = `ICNT-Stagione-${SEASON_CODE}.webp`;

app.get('/dl/poster', (req, res) => {
  if (!fs.existsSync(POSTER_FILE)) {
    return res.status(404).send('File non trovato');
  }
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Content-Disposition', `attachment; filename="${POSTER_NAME}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.sendFile(POSTER_FILE, (err) => {
    if (err) {
      console.error('[DL poster] errore:', err);
      if (!res.headersSent) res.status(err.statusCode || 500).send('Errore download');
    }
  });
});

// === Static Files with Caching ===
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.webp') || filePath.endsWith('.jpg') || filePath.endsWith('.png')) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      // Allow images to be loaded from other domains (CORS)
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  }
}));

// Service Worker & Manifest (no caching for updates)
app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.set('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

app.get('/manifest.json', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json({
    name: "ICNT - I Concerti nel Tempio",
    short_name: "ICNT",
    description: `Stagione concerti ICNT ${SEASON_CODE}`,
    start_url: "/",
    display: "standalone",
    background_color: "#050506",
    theme_color: "#d4af37",
    orientation: "portrait-primary",
    icons: [
      { src: "/public/img/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/public/img/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ],
    shortcuts: [
      { name: "Prossimo Concerto", url: "/next", icons: [{ src: "/public/img/icon-96.png", sizes: "96x96" }] }
    ],
    categories: ["entertainment", "music"],
    lang: "it-IT"
  });
});

// === View Engine ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layout');

app.locals.dayjs = dayjs;
app.locals.TZ = TZ;

// Global variables for ALL views
app.locals.BASE_URL = BASE_URL;
app.locals.GA_MEASUREMENT_ID = GA_MEASUREMENT_ID;

// Middleware to ensure all views have required variables
app.use((req, res, next) => {
  res.locals.BASE_URL = BASE_URL;
  res.locals.GA_MEASUREMENT_ID = GA_MEASUREMENT_ID;
  res.locals.cookieConsent = req.cookies?.cookieConsent || false;

  if (!res.locals.ui) {
    res.locals.ui = { code: SEASON_CODE, filter: 'all' };
  }
  if (!res.locals.meta) {
    res.locals.meta = {
      title: 'ICNT - I Concerti nel Tempio',
      description: 'Stagione concerti ICNT Roma',
      url: BASE_URL,
      image: `${BASE_URL}/public/img/icnt_logo.png`,
      type: 'website',
      locale: 'it_IT'
    };
  }
  next();
});

// === Database Connection ===
let db = null;
if (DB_PATH && fs.existsSync(DB_PATH)) {
  try {
    db = new Database(DB_PATH, { readonly: true });
    console.log('[ICNT] ✅ Connected to SQLite database:', DB_PATH);
  } catch (e) {
    console.error('[ICNT] ❌ Database connection failed:', e.message);
  }
} else {
  console.error('[ICNT] ⚠️ Database not found at:', DB_PATH);
}

// === Helper Functions ===
function seasonDateRange(code) {
  const m = /^(\d{4})-(\d{2})$/.exec(code);
  if (!m) throw new Error('Invalid SEASON_CODE');
  const startY = Number(m[1]);
  const endY = startY + 1;
  const start = dayjs.tz(`${startY}-09-01 00:00:00`, TZ);
  const end = dayjs.tz(`${endY}-06-30 23:59:59`, TZ);
  return { start, end };
}

function parseDetailMap(str) {
  const map = new Map();
  if (!str) return map;
  str.split(';').forEach(pair => {
    const [k, v] = pair.split('=').map(s => (s || '').trim());
    if (k && v) map.set(k, v.replace(/^https?:\/\//, ''));
  });
  return map;
}

function resolveDetailUrl(slug) {
  if (!slug) return null;
  if (DETAIL_MAP.has(slug)) {
    const host = DETAIL_MAP.get(slug);
    return host.startsWith('http') ? host : `https://${host}`;
  }
  const host = DETAIL_HOST_PATTERN.replace('{slug}', slug);
  return host.startsWith('http') ? host : `https://${host}`;
}

// === Data Functions ===
function readEventsFromDb({ seasonCode }) {
  if (!db) {
    console.log('[ICNT] No database connection, falling back to JSON');
    return null;
  }

  try {
    const { start, end } = seasonDateRange(seasonCode);

    // Scopriamo le colonne presenti
    const columns = db.prepare("PRAGMA table_info(concerts)").all();
    const has = (name) => columns.some(c => c.name === name);

    const hasDate        = has('date');
    const hasTitle       = has('title');
    const hasSubtitle    = has('subtitle');
    const hasDescrShort  = has('description_short');
    const hasLocation    = has('location');
    const hasSlug        = has('slug');
    const hasStartsAt    = has('starts_at');  // ← FIX

    const sel = [];
    sel.push('id');
    sel.push(hasSlug ? 'slug' : "printf('event-%d', id) AS slug");
    sel.push(hasTitle ? 'title' : "'Concerto' AS title");
    sel.push(hasSubtitle ? 'subtitle' : 'NULL AS subtitle');
    sel.push(hasDate ? 'date' : 'NULL AS date');
    sel.push(hasStartsAt ? "COALESCE(starts_at, '20:00') AS time" : `'${DEFAULT_START_TIME}' AS time`); // ← FIX
    sel.push(`NULL AS endTime`);
    sel.push(hasLocation ? 'location' : 'NULL AS location');
    sel.push(hasDescrShort ? 'description_short' : 'NULL AS description_short');
    sel.push('1 AS published');

    // Filtro stagione (sulla colonna 'date')
    let whereClause = '1=1';
    const params = [];
    if (hasDate) {
      whereClause = 'date >= ? AND date <= ?';
      params.push(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
    }

    const sql = `
      SELECT
        ${sel.join(',\n        ')}
      FROM concerts
      WHERE ${whereClause}
      ORDER BY ${hasDate ? 'date ASC' : 'id ASC'}
    `;

    const rows = db.prepare(sql).all(...params);
    console.log(`[ICNT] Found ${rows.length} events in database for season ${seasonCode}`);

    const mscNum = (t) => {
      if (!t) return null;
      const m = /MSC\s*([0-9]+)/i.exec(t);
      return m ? m[1] : null;
    };

    return rows.map(r => ({
      ...r,
      season: seasonCode,
      time: r.time || DEFAULT_START_TIME,
      endTime: r.endTime || null,
      type: (r.title || '').match(/MSC/i) ? 'msc' : 'icnt',
      mscNumber: mscNum(r.title || ''),
      detailUrl: resolveDetailUrl(r.slug)
    }));
  } catch (e) {
    console.error('[ICNT] DB query error:', e.message);
    return null;
  }
}

function readEventsFromJson() {
  try {
    const jsonPath = path.join(__dirname, 'data', `season-${SEASON_CODE}.json`);
    if (!fs.existsSync(jsonPath)) {
      console.log('[ICNT] JSON fallback file not found');
      return [];
    }
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    console.log('[ICNT] Using JSON fallback data');
    return Array.isArray(data) ? data : data.events || [];
  } catch (e) {
    console.error('[ICNT] JSON fallback error:', e.message);
    return [];
  }
}

function getEvents(seasonCode) {
  const fromDb = readEventsFromDb({ seasonCode });
  if (fromDb && fromDb.length) {
    return fromDb;
  }
  return readEventsFromJson();
}

function pickNextEvent(events) {
  const today = new Date().toISOString().slice(0, 10);
  const arr = Array.isArray(events) ? events : [];
  const upcoming = arr.find(e => e && typeof e.date === 'string' && e.date >= today);
  return upcoming || (arr.length ? arr[0] : null);
}

// === Stats ===
const stats = {
  pageViews: 0,
  currentVisitors: new Set(),
  bookings: 0
};

// === Tracking Middleware ===
app.use((req, res, next) => {
  stats.pageViews++;
  const visitorId = req.ip + req.get('user-agent');
  const visitorHash = crypto.createHash('md5').update(visitorId).digest('hex');
  stats.currentVisitors.add(visitorHash);
  setTimeout(() => {
    stats.currentVisitors.delete(visitorHash);
  }, 30 * 60 * 1000);
  next();
});

// === Routes ===

// Cookie consent API
app.post('/api/cookie-consent', (req, res) => {
  const { consent } = req.body;
  res.cookie('cookieConsent', consent, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ success: true });
});

// Privacy & Cookie Policy
app.get('/privacy', (req, res) => {
  res.render('privacy', {
    layout: 'layout',
    meta: {
      title: 'Privacy Policy - ICNT',
      description: 'Informativa sulla privacy e sui cookie',
      url: `${BASE_URL}/privacy`
    },
    ui: { code: SEASON_CODE }
  });
});

app.get('/cookies', (req, res) => {
  res.render('cookies', {
    layout: 'layout',
    meta: {
      title: 'Cookie Policy - ICNT',
      description: 'Informativa sui cookie',
      url: `${BASE_URL}/cookies`
    },
    ui: { code: SEASON_CODE }
  });
});

// Redirect root to current season
app.get('/', (_req, res) => res.redirect(301, `/stagione/${SEASON_CODE}`));

// Short URLs
app.get('/s', (_req, res) => res.redirect(301, `/stagione/${SEASON_CODE}`));
app.get('/stagione', (_req, res) => res.redirect(301, `/stagione/${SEASON_CODE}`));

// Next event redirect
app.get('/next', (req, res) => {
  const events = getEvents(SEASON_CODE);
  const next = pickNextEvent(events);
  if (next && next.detailUrl) {
    res.redirect(302, next.detailUrl);
  } else {
    res.redirect(302, `/stagione/${SEASON_CODE}`);
  }
});

// Main season page
app.get('/stagione/:code', (req, res) => {
  try {
    const code = req.params.code || SEASON_CODE;
    const filter = (req.query.f || 'all').toLowerCase();
    const eventsAll = getEvents(code);
    const events = filter === 'all' 
      ? eventsAll 
      : eventsAll.filter(e => {
          if (filter === 'msc') return e.type === 'msc' || e.mscNumber;
          if (filter === 'icnt') return e.type === 'icnt' && !e.mscNumber;
          return true;
        });
    const nextEvent = pickNextEvent(eventsAll);

    res.render('season', {
      layout: 'layout',
      meta: {
        title: `Stagione ICNT ${code} - I Concerti nel Tempio`,
        description: `Calendario completo della stagione ICNT ${code}. ${eventsAll.length} concerti da non perdere a Roma.`,
        url: `${BASE_URL}/stagione/${code}`,
        image: `${BASE_URL}/public/img/icnt_logo.png`,
        type: 'website',
        locale: 'it_IT'
      },
      ui: { code, filter },
      data: { events, nextEvent, allCount: eventsAll.length },
      stats: {
        bookings: stats.bookings,
        visitors: stats.currentVisitors.size
      }
    });
  } catch (e) {
    console.error('[ICNT] Render error:', e.stack || e.message);
    res.status(500).send('Internal Server Error');
  }
});

// === API Endpoints ===
app.get('/api/events.json', (_req, res) => {
  const code = SEASON_CODE;
  const events = getEvents(code);
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ 
    season: code, 
    events,
    count: events.length,
    timestamp: Date.now() 
  });
});

app.get('/api/stats.json', (_req, res) => {
  res.json({
    bookings: stats.bookings,
    visitors: stats.currentVisitors.size,
    pageViews: stats.pageViews,
    timestamp: Date.now()
  });
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json({ results: [] });
  const events = getEvents(SEASON_CODE);
  const results = events.filter(e => 
    e.title?.toLowerCase().includes(q) ||
    e.subtitle?.toLowerCase().includes(q)
  );
  res.json({ query: q, results: results.slice(0, 10), count: results.length });
});

// === Dynamic QR Code ===
app.get('/q.svg', async (_req, res) => {
  try {
    const url = `${BASE_URL}/s`;
    const svg = await QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'Q',
      margin: 4,
      scale: 6,
      color: { dark: '#d4af37', light: '#ffffff' }
    });
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.type('image/svg+xml').send(svg);
  } catch (e) {
    console.error('[ICNT] QR error:', e.message);
    res.status(500).send('QR error');
  }
});

// === ICS Calendar Files ===
app.get('/ics/:slug.ics', (req, res) => {
  const slugParam = req.params.slug;
  const events = getEvents(SEASON_CODE);

  let ev = events.find(e => e.slug === slugParam);
  if (!ev) {
    const dec = decodeURIComponent(slugParam).toLowerCase();
    ev = events.find(e => (e.slug || '').toLowerCase() === dec);
  }
  if (!ev) return res.status(404).send('Not found');

  const start = dayjs.tz(`${ev.date}T${ev.time || DEFAULT_START_TIME}`, TZ);
  const end = ev.endTime 
    ? dayjs.tz(`${ev.date}T${ev.endTime}`, TZ)
    : start.add(2, 'hour');

  const location = ev.location || 'Chiesa Valdese, Via IV Novembre 107, Roma';

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ICNT//Stagione ${SEASON_CODE}//IT
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${ev.id || ev.slug}@icnt.danielecamiz.com
DTSTAMP:${dayjs().utc().format('YYYYMMDDTHHmmss')}Z
DTSTART:${start.utc().format('YYYYMMDDTHHmmss')}Z
DTEND:${end.utc().format('YYYYMMDDTHHmmss')}Z
SUMMARY:${ev.title}${ev.subtitle ? ' - ' + ev.subtitle : ''}
DESCRIPTION:Concerto ICNT${ev.mscNumber ? ' (MSC ' + ev.mscNumber + ')' : ''}
LOCATION:${location.replace(/,/g, '\\,')}
URL:${ev.detailUrl || BASE_URL}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`.replace(/\n/g, '\r\n');

  res.set({
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="${ev.slug || 'event'}.ics"`,
    'Cache-Control': 'no-cache'
  });
  res.send(ics);
});

// === Sitemap ===
app.get('/sitemap.xml', (req, res) => {
  const events = getEvents(SEASON_CODE);
  const urls = [
    { loc: BASE_URL, priority: '1.0' },
    { loc: `${BASE_URL}/stagione/${SEASON_CODE}`, priority: '0.9' },
    { loc: `${BASE_URL}/privacy`, priority: '0.3' },
    { loc: `${BASE_URL}/cookies`, priority: '0.3' }
  ];

  events.forEach(event => {
    if (event.detailUrl) {
      urls.push({
        loc: event.detailUrl,
        priority: '0.8',
        lastmod: dayjs().format('YYYY-MM-DD')
      });
    }
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.map(url => `
        <url>
          <loc>${url.loc}</loc>
          <priority>${url.priority}</priority>
          ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
        </url>
      `).join('')}
    </urlset>`;

  res.set('Content-Type', 'application/xml');
  res.send(sitemap);
});

// === Health Check ===
app.get('/health', (req, res) => {
  const events = getEvents(SEASON_CODE);
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: db ? 'connected' : 'using fallback',
    dbPath: DB_PATH,
    season: SEASON_CODE,
    events: events.length
  });
});

// === 404 Handler ===
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 - Pagina non trovata</title>
      <style>
        body { 
          margin: 0; 
          padding: 20px;
          font-family: system-ui, sans-serif; 
          background: #050506; 
          color: #fafafa;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          text-align: center;
        }
        h1 { color: #d4af37; }
        a { color: #d4af37; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div>
        <h1>404</h1>
        <p>Pagina non trovata</p>
        <p><a href="/stagione/${SEASON_CODE}">Torna al calendario concerti</a></p>
      </div>
    </body>
    </html>
  `);
});

// === Error Handler ===
app.use((err, req, res, next) => {
  console.error('[ICNT] Error:', err.stack);
  res.status(500).send('Internal Server Error');
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║       ICNT SERVER STARTED              ║
╠════════════════════════════════════════╣
║ 🚀 Port: ${PORT}                          ║
║ 📅 Season: ${SEASON_CODE}                     ║
║ 💾 Database: ${db ? '✅ Connected' : '❌ JSON Fallback'}         ║
║ 📊 Analytics: ${GA_MEASUREMENT_ID ? '✅ Enabled' : '⏸️  Disabled'}           ║
║ 🌐 URL: http://localhost:${PORT}         ║
╚════════════════════════════════════════╝
  `);
});
