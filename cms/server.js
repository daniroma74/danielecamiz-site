// cms/templateServer.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env (locale e shared config)
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../config/.env') });

import cookieParser from 'cookie-parser';
import session from 'express-session';
import expressLayouts from 'express-ejs-layouts';
import fileUpload from 'express-fileupload';

// i18n SSR
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';

// Maintenance
import { checkMaintenance as maintenance } from './middleware/maintenanceMiddleware.js';

// Routes (API)
import sitemapRoutes           from './routes/sitemapRoutes.js';
import healthRoutes            from './routes/health.js';
import apiRoutes               from './routes/api/index.js';

// Routes (pages)
import homeRoutes        from './routes/homeRoutes.js';
import bioRoutes         from './routes/bioRoutes.js';
import concertsRoutes    from './routes/concertsRoutes.js';
// ⛔ contactRoutes rimosso
import galleryRoutes     from './routes/galleryRoutes.js';
import newsRoutes        from './routes/newsRoutes.js';
import pressRoutes       from './routes/pressRoutes.js';
import privacyRoutes     from './routes/privacyRoutes.js';
import termsRoutes       from './routes/termsRoutes.js';
import repertoireRoutes  from './routes/repertoireRoutes.js';
import videoRoutes       from './routes/videoRoutes.js';
import uploadRoutes      from './routes/uploadRoutes.js';
import redirectsRoutes   from './routes/redirects.js';

// Utils
import { initDatabase } from './utils/utils.js';
import renderPage from './utils/renderPage.js';

/* i18next init */
await i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'it',
    debug: false,
    backend: {
      // labels-{{ns}}-{{lng}}.json dentro cms/data/i18n
      loadPath: path.join(__dirname, 'data', 'i18n', 'labels-{{ns}}-{{lng}}.json')
    },
    detection: {
      order: ['querystring', 'cookie', 'header'],
      lookupQuerystring: 'lng',
      caches: ['cookie']
    },
    // ⛔ rimosso 'contact'
    ns: ['global','home','bio','concerts','news','gallery','press','repertoire','video','privacy','meta'],
    defaultNS: 'global'
  });

/* Scansione CSS global (base/ + components/ + utils/ + pages root + pages/common) */
const cssRoot = path.join(__dirname, '..', 'frontend', 'css');
async function walkCss(absDir, relDir) {
  let out = [];
  try {
    const entries = await fs.readdir(absDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const abs = path.join(absDir, e.name);
      const rel = (relDir ? relDir + '/' : '') + e.name;
      if (e.isDirectory()) out = out.concat(await walkCss(abs, rel));
      else if (e.isFile() && e.name.endsWith('.css')) out.push('/css/' + rel.replace(/\\/g, '/'));
    }
  } catch {}
  out.sort();
  return out;
}
async function listCssTop(absDir, relDir) {
  let out = [];
  try {
    const entries = await fs.readdir(absDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.css')) {
        const rel = (relDir ? relDir + '/' : '') + e.name;
        out.push('/css/' + rel.replace(/\\/g, '/'));
      }
    }
  } catch {}
  out.sort();
  return out;
}

const app = express();
app.set('trust proxy', true);
app.locals.cssGlobal = [
  ...(await walkCss(path.join(cssRoot, 'base'), 'base')),
  ...(await walkCss(path.join(cssRoot, 'components'), 'components')),
  ...(await walkCss(path.join(cssRoot, 'utils'), 'utils')),
  ...(await listCssTop(path.join(cssRoot, 'pages'), 'pages')),
  ...(await walkCss(path.join(cssRoot, 'pages', 'common'), 'pages/common'))
];

/* View engine & layout */
app.use(expressLayouts);
app.set('layout', 'layouts/base-frontend');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// ⛔ niente override layout per /contact

/* Parsers & session */
app.use(cookieParser());
app.use((req, res, next) => {
  // usato nelle view (es. per Bandcamp embed)
  const cc = req.cookies?.cookieConsent || req.cookies?.['cookie-consent'] || req.cookies?.cookie_consent || 'unknown';
  res.locals.cookieConsent = cc;
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false
}));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
  useTempFiles: false,
  abortOnLimit: true,
  safeFileNames: true,
  preserveExtension: true
}));

/* Alias ?lang= → ?lng= */
app.use((req, res, next) => {
  if (req.query && typeof req.query.lang === 'string' && !req.query.lng) req.query.lng = req.query.lang;
  next();
});

/* i18n middleware + locals base */
// Default lingua: IT alla prima visita (nessun ?lng e nessun cookie)
app.use((req, res, next) => {
  const hasQuery = (typeof req.query?.lng === 'string') || (typeof req.query?.lang === 'string');
  const hasCookie = (typeof req.cookies?.i18next === 'string') && Boolean(req.cookies.i18next);
  if (!hasQuery && !hasCookie) {
    res.cookie('i18next', 'it', { maxAge: 31536000000, httpOnly: false, sameSite: 'Lax', path: '/' });
    req.query.lng = 'it';
  }
  next();
});
app.use(middleware.handle(i18next));
app.use((req, res, next) => {
  const rawLang = req.query.lng || req.language || 'it';
  const lang = (rawLang === 'en' || rawLang === 'it') ? rawLang : 'it';
  res.locals.lang = lang;

  res.locals.t = (key, def = '') => {
    // Navigate through res.locals.labels first
    try {
      const labels = res.locals.labels;
      const parts = String(key || '').split('.');
      let cur = labels;
      for (const p of parts) {
        if (!cur || typeof cur !== 'object') { cur = undefined; break; }
        cur = cur[p];
      }
      if (typeof cur === 'string' && String(cur).trim() !== '') {
        return cur;
      }
    } catch {}

    return def || key;
  };
  next();
});

/* Locals default */
app.use((req, res, next) => {
  const urlNoQuery = `${req.protocol}://${req.get('host')}${(req.originalUrl || '').split('?')[0] || ''}`;
  if (typeof res.locals.title       === 'undefined') res.locals.title       = 'Daniele Camiz';
  if (typeof res.locals.description === 'undefined') res.locals.description = '';
  if (typeof res.locals.keywords    === 'undefined') res.locals.keywords    = '';
  if (typeof res.locals.canonical   === 'undefined') res.locals.canonical   = urlNoQuery;
  if (typeof res.locals.ogImage     === 'undefined') res.locals.ogImage     = '/img/icons/favicon-180.png';
  if (!Array.isArray(res.locals.cssFiles))    res.locals.cssFiles = [];
  if (typeof res.locals.pageCss === 'undefined') res.locals.pageCss = '';
  if (!Array.isArray(res.locals.pageScripts)) res.locals.pageScripts = [];
  if (typeof res.locals.bodyClass === 'undefined') res.locals.bodyClass = '';

  // Link esterni (moduli admin separati)
  res.locals.externalLinks = {
    bookingsAdmin: process.env.BOOKINGS_ADMIN_URL || '',
    newsletterAdmin: process.env.NEWSLETTER_ADMIN_URL || ''
  };

  next();
});

/* Load labels bundles into res.locals.labels */
app.use(async (req, res, next) => {
  try {
    const lang = res.locals.lang || req.language || 'it';
    const namespaces = Array.isArray(i18next.options?.ns) ? i18next.options.ns : [];
    const labels = {};
    for (const ns of namespaces) {
      try {
        const bundle = i18next.getResourceBundle(lang, ns);
        if (bundle && typeof bundle === 'object') {
          // Unwrap if first key equals namespace (avoid double nesting)
          const keys = Object.keys(bundle);
          if (keys.length === 1 && keys[0] === ns) {
            labels[ns] = bundle[ns];
          } else {
            labels[ns] = bundle;
          }
        }
      } catch {}
    }
    if (Object.keys(labels).length) {
      res.locals.labels = labels;
    }
    res.locals.lang = lang;
    if (typeof res.locals.pageMeta === 'undefined') {
      const homeNs = labels.home || {};
      const title = (typeof homeNs.title === 'string' && homeNs.title.trim()) ? homeNs.title : 'Daniele Camiz';
      const description = (typeof homeNs.description === 'string') ? homeNs.description : '';
      res.locals.pageMeta = { title, description };
    }
  } catch {}
  next();
});

// Attach renderPage helpers (non registra catch-all)
app.use(renderPage(app));

/* Static */
app.use('/data',      express.static(path.join(__dirname, 'data')));
app.use('/css',       express.static(path.join(__dirname, '..', 'frontend', 'css')));
app.use('/js',        express.static(path.join(__dirname, '..', 'frontend', 'js')));
app.use('/img',       express.static(path.join(__dirname, '..', 'frontend', 'img')));
app.use('/uploads',   express.static(path.join(__dirname, 'uploads')));
app.use('/media',     express.static(path.join(__dirname, 'uploads')));
app.use('/frontend',  express.static(path.join(__dirname, '..', 'frontend')));
app.use('/manifest.json', express.static(path.join(__dirname, '..', 'frontend', 'manifest.json')));

/* /lang/:lng */
app.get('/lang/:lng', (req, res) => {
  const lngRaw = (req.params.lng || '').toLowerCase();
  const lng = (lngRaw === 'en' || lngRaw === 'it') ? lngRaw : 'it';
  res.cookie('i18next', lng, { maxAge: 31536000000, httpOnly: false, sameSite: 'Lax', path: '/' });
  const ret = req.query.return || req.get('referer') || '/';
  let redirectTo = '/';
  try {
    const base = `${req.protocol}://${req.get('host')}`;
    const url = new URL(ret, base);
    url.searchParams.set('lng', lng);
    redirectTo = url.pathname + url.search + url.hash;
  } catch { redirectTo = '/?lng=' + lng; }
  return res.redirect(302, redirectTo);
});

/* APIs (prima della maintenance) */
app.use('/api',       apiRoutes);
app.use('/upload',    uploadRoutes);
app.use('/',          sitemapRoutes);
app.use('/health',    healthRoutes);

/* Maintenance globale/pagine */
app.use((req, res, next) => {
  const p = req.path || '';
  if (
    p.startsWith('/upload') ||
    p.startsWith('/uploads') ||
    p.startsWith('/media') ||
    p.startsWith('/api/_ping') ||
    p.startsWith('/health') ||
    p === '/sitemap-news.xml'
  ) return next();
  return maintenance(req, res, next);
});

/* Pages - ordine critico */

// Pagine specifiche prima
app.use('/bio',        bioRoutes);
app.use('/concerts',   concertsRoutes);
app.use('/gallery',    galleryRoutes);
app.use('/news',       newsRoutes);
app.use('/press',      pressRoutes);
app.use('/privacy',    privacyRoutes);
app.use('/terms',      termsRoutes);
app.use('/repertoire', repertoireRoutes);
app.use('/video',      videoRoutes);

// ⛔ Blocca qualunque /contact residuo
app.all('/contact', (req, res) => res.sendStatus(410)); // Gone

// ⛔ Blocca qualunque /admin o /auth residuo
app.use('/admin', (req, res) => res.sendStatus(410)); // Gone
app.use('/auth', (req, res) => res.sendStatus(410)); // Gone

// Home — PER ULTIMA
app.use('/', homeRoutes);

// Redirects sempre alla fine
app.use('/r', redirectsRoutes);

/* 404 & 500 */
app.use((req, res) => {
  res.status(404).renderPage('pages/frontend/index', {
    title: (res.locals.lang === 'en') ? 'Not found' : 'Pagina non trovata',
    homeData: { hero: {} },
    projects: [],
    newsTeaser: [],
    bandcampItems: []
  });
});
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).renderPage('pages/frontend/index', {
    title: (res.locals.lang === 'en') ? 'Internal error' : 'Errore interno',
    homeData: { hero: {} },
    projects: [],
    newsTeaser: [],
    bandcampItems: []
  });
});

/* Start */
initDatabase()
  .then(db => {
    // DB condiviso
    app.locals.db = db;
    try {
      // se l'helper non setta filename, impostiamo quello atteso per i log
      if (!db.filename) db.filename = path.resolve(__dirname, 'db', 'main.sqlite');
      console.log('[Server] DB condiviso:', db.filename);
    } catch {}
    const port = process.env.PORT || 3001;
    app.listen(port, () => console.log(`Server started on port ${port}`));
  })
  .catch(err => {
    console.error('Database init error', err);
    process.exit(1);
  });

export default app;
