// cms/scripts/archive-landing-newsletter.mjs
// Sposta in cms/_archive/landing-newsletter-legacy/ tutti i file legacy
// relativi a landing / booking / newsletter (cms + frontend), SENZA eliminarli.
//
// Uso:
//   node cms/scripts/archive-landing-newsletter.mjs

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..');
const CMS_ROOT   = path.join(REPO_ROOT, 'cms');

const ARCHIVE_DIR = path.join(CMS_ROOT, '_archive', 'landing-newsletter-legacy', new Date().toISOString().slice(0,10));

const TARGETS = [
  // ROUTES legacy
  'cms/routes/newsletterRoutes.js',
  'cms/routes/eventsRoutes.js',
  'cms/routes/bookingsRoutes.js',
  'cms/routes/admin/eventsRoutes.js',
  'cms/routes/concertoAutunno.js',

  // VIEWS legacy (admin/events + frontend/event)
  'cms/views/pages/admin/events',          // cartella
  'cms/views/pages/frontend/event.ejs',

  // PUBLIC admin JS per eventi/landing
  'cms/public/admin/js/events',            // cartella

  // JS frontend specifico per pagina evento
  'frontend/js/event.js',

  // altri possibili supporti legacy (se presenti)
  'cms/models/landingRepo.js',
  'cms/landingMount.js'
];

async function ensureDir(p){ await fs.mkdir(p, { recursive: true }); }

async function exists(p){
  try { await fs.stat(p); return true; } catch { return false; }
}

async function moveRel(rel){
  const src = path.join(REPO_ROOT, rel);
  if (!(await exists(src))) {
    console.log('SKIP -', rel);
    return;
  }
  const dst = path.join(ARCHIVE_DIR, rel);
  await ensureDir(path.dirname(dst));
  await fs.rename(src, dst);
  console.log('MOVE -', rel, '→', path.relative(REPO_ROOT, dst));
}

(async () => {
  console.log('== Archivio legacy landing/booking/newsletter ==');
  console.log('→', path.relative(REPO_ROOT, ARCHIVE_DIR));
  await ensureDir(ARCHIVE_DIR);
  for (const rel of TARGETS) {
    try { await moveRel(rel); } catch (e) { console.error('ERR -', rel, e.message); }
  }
  console.log('Fatto.');
})();
