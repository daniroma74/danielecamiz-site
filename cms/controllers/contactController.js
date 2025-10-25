// cms/controllers/contactController.js
import path from 'path';
import fs from 'fs/promises';

import { listPageCss, havePageJs } from '../utils/assetHelpers.js';
import { resolveMediaById, resolveFrontendImg } from '../utils/mediaResolver.js';

// === COSTANTI (mancavano) ===
const ROOT = process.cwd();
const I18N_DIR = path.resolve(ROOT, 'cms/data/i18n');
const FRONTEND_ROOT = path.resolve(ROOT, 'frontend');

/* ===================== helpers ===================== */
async function readJSONSafe(absPath) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadContact(lang = 'it') {
  const tryPaths = [
    path.join(I18N_DIR, `contact-${lang}.json`),
    path.join(I18N_DIR, 'contact-it.json'),
    path.join(I18N_DIR, 'contact-en.json')
  ];
  for (const p of tryPaths) {
    const data = await readJSONSafe(p);
    if (data && typeof data === 'object') return data;
  }
  return {};
}

function normalizeUrl(u = '') {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith('/') ? s : `/${s}`;
}

function normalizeLinks(list) {
  if (!Array.isArray(list)) return [];
  return list.map(x => ({
    ...(typeof x === 'object' && x ? x : {}),
    url: normalizeUrl((typeof x === 'object' && x) ? x.url : '')
  }));
}

async function normalizeContactAsync(raw = {}, lang = 'it') {
  const contactData = {
    avatar: '', // risolto sotto
    title: raw.title || (lang === 'en' ? 'Contacts' : 'Contatti'),
    role: raw.role || '',

    highlightsTitle: raw.highlightsTitle || raw.featured_title || '',
    highlights: Array.isArray(raw.highlights)
      ? normalizeLinks(raw.highlights)
      : (Array.isArray(raw.featured_links) ? normalizeLinks(raw.featured_links) : []),

    onlineTitle: raw.onlineTitle || raw.social_title || '',
    socialLinks: Array.isArray(raw.socialLinks)
      ? normalizeLinks(raw.socialLinks)
      : (Array.isArray(raw.social_links) ? normalizeLinks(raw.social_links) : []),

    extraTitle: raw.extraTitle || raw.extra_title || '',
    extraLinks: Array.isArray(raw.extraLinks)
      ? normalizeLinks(raw.extraLinks)
      : (Array.isArray(raw.extra_links) ? normalizeLinks(raw.extra_links) : []),
  };

  // Avatar/media resolution
  const media = (raw && typeof raw === 'object') ? (raw.media || {}) : {};
  const avatarId = media.avatar_media_id ?? raw.avatar_media_id ?? null;
  let avatar = null;

  if (avatarId != null) {
    try {
      avatar = await resolveMediaById(avatarId, { width: 600, height: 600, crop: 'fill', quality: 'auto', format: 'auto' });
    } catch {}
  }
  if (!avatar) {
    const avatarRaw = raw.avatar || raw.photo || raw.image || '';
    if (avatarRaw) {
      if (/^https?:\/\//i.test(avatarRaw)) {
        avatar = avatarRaw;
      } else {
        avatar = resolveFrontendImg(avatarRaw) || normalizeUrl(avatarRaw);
      }
    }
  }

  contactData.avatar = avatar || '/img/daniele-camiz-foto-profilo.png';
  return contactData;
}

async function collectContactScripts() {
  const candidates = [
    { abs: path.join(FRONTEND_ROOT, 'js', 'modules', 'contact', 'contact-init.js'),  web: '/js/modules/contact/contact-init.js' },
    { abs: path.join(FRONTEND_ROOT, 'js', 'modules', 'contact', 'contact.js'),       web: '/js/modules/contact/contact.js' },
    { abs: path.join(FRONTEND_ROOT, 'js', 'modules', 'contact', 'contact-render.js'), web: '/js/modules/contact/contact-render.js' },
    { abs: path.join(FRONTEND_ROOT, 'js', 'modules', 'contact', 'contact-utils.js'),  web: '/js/modules/contact/contact-utils.js' }
  ];
  const out = [];
  for (const c of candidates) {
    try { await fs.access(c.abs); out.push(c.web); } catch {}
  }
  const entry = havePageJs('contact');
  if (entry && !out.includes(entry)) out.push(entry);
  return out;
}

/* ===================== controller ===================== */
export async function getContactPage(req, res) {
  console.log("[CONTACT] handler start:", (req.originalUrl||req.url), "path=", req.path);
  const lang = (res.locals.lang || req.language || 'it').toLowerCase();
  try {
    const labelsAll = res.locals.labels || {};
    const L = labelsAll.contact || (labelsAll.pages && labelsAll.pages.contact) || {};

    const raw = await loadContact(lang);
    const contactData = await normalizeContactAsync(raw, lang);

    const title = contactData.title || L.title || (lang === 'en' ? 'Contacts' : 'Contatti');
    const description = contactData.onlineTitle || L.claim || '';

    const cssFiles = listPageCss('linktree');
    const pageScripts = await collectContactScripts();

    return res.renderPage('pages/frontend/contact', {
      layout: 'layouts/base-frontend',
      lang,
      labels: labelsAll,
      title,
      description,
      pageMeta: { title, description },
      cssFiles,
      pageStyles: cssFiles,
      pageScripts,
      contactData,
      isContact: true
    });
  } catch (err) {
    console.error("[CONTACT] error:", err);
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang,
      title: (lang === 'en') ? 'Error loading Contact page' : 'Errore caricando la pagina Contatti',
      description: ''
    });
  }
}
