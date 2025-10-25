// cms/controllers/sitemapController.js
// Sitemap News basata su utils/newsStore.js (fonte unica: cms/data/news/posts.json)

import * as Store from '../utils/newsStore.js';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minuti
let cache = { xml: null, until: 0 };

function now() { return Date.now(); }
function ts(d) { const t = Date.parse(String(d||'')); return Number.isFinite(t) ? t : NaN; }
function shortDate(d) { try { return new Date(d).toISOString().slice(0,10); } catch { return ''; } }

function baseUrl(req) {
  const env = process.env.SITE_BASE_URL && String(process.env.SITE_BASE_URL).trim();
  if (env) return env.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const host = req.get('host');
  return `${proto}://${host}`;
}

function fetchPublished(lang) {
  const n = now();
  if (typeof Store.list === 'function') {
    const out = Store.list({ lang, status: 'published', q: '', offset: 0, limit: 10000 });
    const items = Array.isArray(out?.items) ? out.items : Array.isArray(out) ? out : [];
    return items.filter(p => (!p.scheduled_at || ts(p.scheduled_at) <= n) && (!p.published_at || ts(p.published_at) <= n));
  }
  if (typeof Store.listPublished === 'function') {
    const items = Store.listPublished({ lang, limit: 10000 }) || [];
    return items.filter(p => (!p.scheduled_at || ts(p.scheduled_at) <= n) && (!p.published_at || ts(p.published_at) <= n));
  }
  return [];
}

function groupKey(p) {
  return String(p.group_id || p.canonical_id || '').trim() || null;
}

function absPostUrl(req, p) {
  const base = baseUrl(req);
  const path = `/news/${p.slug || p.id}`;
  // Manteniamo la distinzione di lingua via querystring, in linea con le alternates in <head>
  const addLng = `?lng=${p.lang || 'it'}`;
  return base + path + addLng;
}

function xmlEscape(s='') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function buildXml(req) {
  const it = fetchPublished('it');
  const en = fetchPublished('en');

  // Raggruppa IT/EN dello stesso articolo
  const groups = new Map(); // key => { it: post?, en: post? }
  function put(p) {
    const k = groupKey(p) || `${p.slug || p.id}__${p.lang}`;
    const bucket = groups.get(k) || { it: null, en: null };
    bucket[p.lang === 'en' ? 'en' : 'it'] = p;
    groups.set(k, bucket);
  }
  it.forEach(put);
  en.forEach(put);

  let xml = '';
  xml += '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
  xml += 'xmlns:xhtml="http://www.w3.org/1999/xhtml">';

  for (const [, pair] of groups) {
    const hasIt = !!pair.it;
    const hasEn = !!pair.en;

    const variants = [pair.it, pair.en].filter(Boolean);
    for (const p of variants) {
      const loc = absPostUrl(req, p);
      const lastmod = shortDate(p.updated_at || p.published_at || p.created_at || Date.now());

      const itHref = hasIt ? absPostUrl(req, { ...pair.it, lang: 'it' }) : null;
      const enHref = hasEn ? absPostUrl(req, { ...pair.en, lang: 'en' }) : null;
      const xdef = itHref || enHref || loc;

      xml += '<url>';
      xml += `<loc>${xmlEscape(loc)}</loc>`;
      xml += `<lastmod>${xmlEscape(lastmod)}</lastmod>`;
      if (itHref) xml += `<xhtml:link rel="alternate" hreflang="it" href="${xmlEscape(itHref)}"/>`;
      if (enHref) xml += `<xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(enHref)}"/>`;
      xml += `<xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(xdef)}"/>`;
      xml += '</url>';
    }
  }

  xml += '</urlset>';
  return xml;
}

export async function getNewsSitemap(req, res) {
  try {
    if (cache.xml && cache.until > now()) {
      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=600');
      return res.status(200).send(cache.xml);
    }
    const xml = buildXml(req);
    cache = { xml, until: now() + CACHE_TTL_MS };

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=600');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('[sitemap] error:', err);
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error/>');
  }
}

export default { getNewsSitemap };
