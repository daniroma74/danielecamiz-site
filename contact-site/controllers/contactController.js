import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.join(__dirname, '..');
const CONTENT_DIR= path.join(ROOT, 'content');

async function readJsonSafe(p) {
  try { return JSON.parse(await fs.readFile(p,'utf8')); } catch { return null; }
}

function pickLang(req) {
  const p = (req.params?.lang || '').toLowerCase();
  if (p === 'it' || p === 'en') return p;
  const c = (req.cookies?.i18next || '').toLowerCase();
  if (c === 'it' || c === 'en') return c;
  return 'it';
}

function normalizeUrl(u='') {
  const s = String(u||'').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith('/') ? s : '/'+s;
}

function normalizeLinks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(x => x && (x.url || x.text))
    .map(x => ({
      text: x.text || x.url || '',
      url: normalizeUrl(x.url || ''),
      icon: x.icon ? normalizeUrl(x.icon) : ''
    }));
}

function adaptContact(raw={}, lang='it') {
  const media = raw.media || {};
  return {
    avatar: normalizeUrl(media.avatar_url || raw.avatar || '/img/daniele-camiz-foto-profilo.png'),
    title: raw.title || (lang==='en'?'Contacts':'Contatti'),
    role: raw.role || '',
    highlightsTitle: raw.highlightsTitle || (lang==='en'?'Highlights':'In evidenza'),
    highlights: normalizeLinks(raw.highlights || []),
    onlineTitle: raw.onlineTitle || (lang==='en'?'Online':'Online'),
    socialLinks: normalizeLinks(raw.socialLinks || []),
    extraTitle: raw.extraTitle || (lang==='en'?'More links':'Altri link'),
    extraLinks: normalizeLinks(raw.extraLinks || [])
  };
}

export async function getContactPage(req, res) {
  const lang = pickLang(req);
  const jsonPath = path.join(CONTENT_DIR, `contact-${lang}.json`);
  const raw = (await readJsonSafe(jsonPath)) || {};
  const contactData = adaptContact(raw, lang);

  return res.render('contact', {
    layout: 'layout',
    lang,
    title: contactData.title,
    description: contactData.role || '',
    contactData
  });
}
