import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const maintenanceFile = path.join(__dirname, '..', 'config', 'maintenance.json');

function isWhitelisted(reqPath) {
  const WHITELIST = [
    /^\/lang(\/|$)/,          // cambio lingua
    /^\/css(\/|$)/,           // asset statici
    /^\/js(\/|$)/,
    /^\/img(\/|$)/,
    /^\/data(\/|$)/,
    /^\/manifest\.json$/,
    /^\/favicon\.ico$/,
    /^\/robots\.txt$/,
    /^\/privacy$/,            // pagine legali sempre accessibili
    /^\/terms$/,
    /^\/api\/youtube(\/|$)/   // per Home: ultimi video
  ];
  return WHITELIST.some(re => re.test(reqPath));
}

function mapPageKey(reqPath) {
  const MAP = [
    { prefix: '/bio',        key: 'bio' },
    { prefix: '/concerti',   key: 'concerti' },
    { prefix: '/concerts',   key: 'concerti' },
    { prefix: '/contatti',   key: 'contatti' },
    { prefix: '/contact',    key: 'contatti' },
    { prefix: '/galleria',   key: 'galleria' },
    { prefix: '/gallery',    key: 'galleria' },
    { prefix: '/video',      key: 'video' },
    { prefix: '/repertorio', key: 'repertorio' },
    { prefix: '/repertoire', key: 'repertorio' },
    { prefix: '/press',      key: 'press' },
    { prefix: '/privacy',    key: 'privacy' },
    { prefix: '/terms',      key: 'terms' }
  ];
  const hit = MAP.find(m => reqPath === m.prefix || reqPath.startsWith(m.prefix + '/'));
  return hit ? hit.key : null;
}

export async function checkMaintenance(req, res, next) {
  try {
    const p = req.path || '/';

    // Upload sempre accessibile
    if (p.startsWith('/upload')) return next();

    // Whitelist: lingua, statici, legali, API yt
    if (isWhitelisted(p)) return next();

    // Config opzionale
    let config = null;
    try {
      const raw = await fs.readFile(maintenanceFile, 'utf8');
      config = JSON.parse(raw);
    } catch {
      return next();
    }

    // Blocco globale
    if (config?.global) {
      return res.status(503).render('maintenance/maintenance', { type: 'global' });
    }

    // Blocco per pagina
    const pageKey = mapPageKey(p);
    if (pageKey && config?.pages && config.pages[pageKey]) {
      return res.status(503).render('maintenance/maintenance', { type: 'page', page: pageKey });
    }

    return next();
  } catch (e) {
    console.error('Errore manutenzione:', e);
    return next();
  }
}
