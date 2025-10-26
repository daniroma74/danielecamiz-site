// cms/controllers/newsController.js
// Frontend News controller — single source of truth: utils/newsStore.js

import path from 'path';
import fs from 'fs/promises';

import { listPageCss, havePageJs } from '../utils/assetHelpers.js';
import { getCategories } from '../utils/newsCategories.js';
import * as Store from '../utils/newsStore.js';
import { buildCoverCardSrcset, buildCoverPostSrcset, buildCoverLqip, resolveFrontendImg } from '../utils/mediaResolver.js';

const CMS_ROOT = process.cwd();
const FRONTEND_ROOT = path.resolve(CMS_ROOT, '..', 'frontend');
const PAGE_SIZE = Number(process.env.NEWS_PAGE_SIZE || 12);

/* ===================== generic helpers ===================== */
function normalizeLang(input, def = 'it') {
  const raw = String(input || '').toLowerCase();
  const two = raw.includes('-') ? raw.split('-')[0] : raw;
  return (two === 'en' || two === 'it') ? two : def;
}
function ts(d) {
  const t = Date.parse(String(d || ''));
  return Number.isFinite(t) ? t : NaN;
}
function shortDate(d) {
  try { return new Date(d).toISOString().slice(0, 10); } catch { return ''; }
}
function computeReadingMinutes(md = '') {
  const words = String(md || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
function xmlEscape(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
function rfc822(dateStr) {
  const N = ts(dateStr);
  const d = Number.isFinite(N) ? new Date(N) : new Date();
  return d.toUTCString();
}
function baseUrl(req) {
  const env = process.env.SITE_BASE_URL && String(process.env.SITE_BASE_URL).trim();
  if (env) return env.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const host = req.get('host');
  return `${proto}://${host}`;
}
function absolutize(base, url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return base + (url.startsWith('/') ? url : `/${url}`);
}
function toInt(v, def = 1) {
  const n = parseInt(String(v || '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

/* ===================== SSR helpers ===================== */
function mdToHtml(src = '') {
  let s = String(src);
  // Escape minimal first
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Headings
  s = s.replace(/^######\s?(.*)$/gm, '<h6>$1</h6>')
       .replace(/^#####\s?(.*)$/gm, '<h5>$1</h5>')
       .replace(/^####\s?(.*)$/gm, '<h4>$1</h4>')
       .replace(/^###\s?(.*)$/gm, '<h3>$1</h3>')
       .replace(/^##\s?(.*)$/gm, '<h2>$1</h2>')
       .replace(/^#\s?(.*)$/gm, '<h1>$1</h1>');
  // Bold / italic / links
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Paragraphs
  s = s.replace(/\n{2,}/g, '\n\n').split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
  return s;
}

/* ===================== asset discovery (unchanged) ===================== */
async function collectPageScripts() {
  const candidates = [
    { abs: path.join(FRONTEND_ROOT, 'js', 'modules', 'news', 'news-init.js'),  web: '/js/modules/news/news-init.js' },
    { abs: path.join(FRONTEND_ROOT, 'js', 'modules', 'news', 'news.js'),       web: '/js/modules/news/news.js' },
    { abs: path.join(FRONTEND_ROOT, 'js', 'modules', 'news', 'news-render.js'), web: '/js/modules/news/news-render.js' }
  ];
  const out = [];
  for (const c of candidates) {
    try { await fs.access(c.abs); out.push(c.web); } catch {}
  }
  return out;
}

/* ===================== store access ===================== */
async function fetchPublished(lang, limit = 300) {
  const now = Date.now();
  // Prefer modern list API if present
  if (typeof Store.list === 'function') {
    const out = await Store.list({ lang, status: 'published', q: '', offset: 0, limit });
    const items = Array.isArray(out?.items) ? out.items : (Array.isArray(out) ? out : []);
    return items.filter(p => (!p.scheduled_at || ts(p.scheduled_at) <= now) && (!p.published_at || ts(p.published_at) <= now));
  }
  // Fallback to listPublished
  if (typeof Store.listPublished === 'function') {
    const arr = await Store.listPublished({ lang, limit }) || [];
    return arr.filter(p => (!p.scheduled_at || ts(p.scheduled_at) <= now) && (!p.published_at || ts(p.published_at) <= now));
  }
  // Last resort
  if (typeof Store.all === 'function') {
    const arr = await Store.all() || [];
    return arr.filter(p => p.status === 'published' && (!p.scheduled_at || ts(p.scheduled_at) <= now) && (!p.published_at || ts(p.published_at) <= now) && (!lang || p.lang === lang));
  }
  return [];
}

// Fix: rendi ASYNC
async function findByIdOrSlug(idOrSlug, { lang } = {}) {
  if (!idOrSlug) return null;
  
  // Usa await perché Store.getByIdOrSlug ora è Promise-based
  if (typeof Store.getByIdOrSlug === 'function') {
    const mixed = await Store.getByIdOrSlug(idOrSlug, { lang });
    if (mixed) return mixed;
  }
  
  if (typeof Store.getById === 'function') {
    const byId = await Store.getById(idOrSlug);
    if (byId) return byId;
  }
  
  // Fallback: cerca tra tutti i pubblicati
  const all = await fetchPublished('', 500);
  let hit = null;
  if (lang) hit = all.find(p => (p.lang === lang) && (p.slug === idOrSlug));
  if (!hit) hit = all.find(p => p.slug === idOrSlug);
  return hit || null;
}


  
/* ===================== controllers ===================== */
export async function listNews(req, res) {
  try {
    const lang = normalizeLang(res.locals.lang || req.language || 'it', 'it');
    const labelsAll = res.locals.labels || {};
    const L = labelsAll.news || (labelsAll.pages && labelsAll.pages.news) || {};

    // ===== fetch & sort =====
    const items = await fetchPublished(lang, 600);
    const published = items.sort((a, b) => ts(b.published_at || b.updated_at || b.created_at) - ts(a.published_at || a.updated_at || a.created_at));

    // ===== map to view model =====
    const mapped = published.map(p => {
      const coverRaw = p.cover_url || (p.seo ? p.seo.og_image : '');
      const cover = resolveFrontendImg(coverRaw) || coverRaw;
      const localSet = buildCoverCardSrcset(cover);
      const lq = buildCoverLqip(cover);
      return {
        id: p.id,
        title: p.title || '',
        date: shortDate(p.published_at || p.created_at),
        category: p.category || 'News',
        category_id: p.category_id || null,
        image: cover,
        cover_url: cover,
        image_src: localSet?.src || '',
        image_srcset: localSet?.srcset || '',
        image_sizes: localSet?.sizes || '',
        image_lqip: (lq?.data_uri || lq?.url || ''),
        excerpt: p.excerpt || '',
        content_md: p.content_md || '',
        reading_time: computeReadingMinutes(p.content_md),
        tags: Array.isArray(p.tags) ? p.tags : [],
        href: `/news/${p.slug || p.id}`
      };
    });

    // ===== categories =====
    const categories = await getCategories(lang);
    const catIds = new Set(categories.map(c => c.id));
    const qsCat = String(req.query.cat || '').trim();
    const activeCat = qsCat && catIds.has(qsCat) ? qsCat : 'all';

    // ===== pagination (server-side) =====
    const total = mapped.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const pageReq = toInt(req.query.pg, 1);
    const page = clamp(pageReq, 1, pageCount);
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = mapped.slice(start, end);

    function pageUrl(n) {
      const q = new URLSearchParams();
      if (activeCat && activeCat !== 'all') q.set('cat', activeCat);
      if (n && n > 1) q.set('pg', String(n));
      const qs = q.toString();
      return '/news' + (qs ? ('?' + qs) : '');
    }
    const prevUrl = page > 1 ? pageUrl(page - 1) : null;
    const nextUrl = page < pageCount ? pageUrl(page + 1) : null;

    const title = L.title || (lang === 'en' ? 'News' : 'News');
    const description = L.claim || '';

    const cssFiles = listPageCss('news');
    let pageScripts = [];
    const entry = havePageJs('news');
    if (entry) pageScripts.push(entry);
    const extras = await collectPageScripts();
    for (const s of extras) if (!pageScripts.includes(s)) pageScripts.push(s);

    return res.renderPage('pages/frontend/news', {
      layout: 'layouts/base-frontend',
      lang,
      labels: labelsAll,
      title,
      description,
      pageMeta: { title, description, relPrev: prevUrl, relNext: nextUrl },
      cssFiles,
      pageStyles: cssFiles,
      pageScripts,
      news: pageItems,
      isNews: true,
      categories,
      activeCat,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        pageCount,
        total,
        prevUrl,
        nextUrl,
        urlFor: {
          p1: pageUrl(1),
          p2: pageUrl(2),
          p3: pageUrl(3)
        }
      }
    });
  } catch (err) {
    console.error('[newsController] listNews error:', err);
    const lang = normalizeLang(res.locals.lang || req.language || 'it', 'it');
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang,
      title: (lang === 'en') ? 'Error loading News' : 'Errore caricando le News',
      description: ''
    });
  }
}

// E aggiorna getNewsArticle per usare await:

export async function getNewsArticle(req, res) {
  try {
    const lang = normalizeLang(res.locals.lang || req.language || 'it', 'it');
    const labelsAll = res.locals.labels || {};
    const L = labelsAll.news || (labelsAll.pages && labelsAll.pages.news) || {};

    const idOrSlug = req.params.id;
    const p = await findByIdOrSlug(idOrSlug, { lang }); // ✅ AGGIUNGI await QUI
    
    if (!p || p.status !== 'published') {
      return res.status(404).renderPage('pages/frontend/news-post', {
        layout: 'layouts/base-frontend',
        lang,
        post: null,
        title: (lang === 'en') ? 'Article not found' : 'Articolo non trovato',
        description: ''
      });
    }

    // ... resto del codice invariato

    const resolvedCover = resolveFrontendImg(p.cover_url || (p.seo ? p.seo.og_image : '')) || (p.cover_url || (p.seo ? p.seo.og_image : ''));
    const viewPost = {
      ...p,
      lang: p.lang || lang,
      date: shortDate(p.published_at || p.created_at),
      image: resolvedCover,
      content: `<div class=\"content-md\">${mdToHtml(p.content_md || '')}</div>`
    };

    // Local responsive variants (if present)
    const postSet = buildCoverPostSrcset(viewPost.image);
    if (postSet) {
      viewPost.image_src = postSet.src;
      viewPost.image_srcset = postSet.srcset;
      viewPost.image_sizes = postSet.sizes;
      const lq = buildCoverLqip(viewPost.image);
      if (lq) {
        viewPost.image_lqip = lq.data_uri || lq.url;
      }
    }

    const canonical = `${baseUrl(req)}/news/${p.slug || p.id}`;

    // ===== Alternates (hreflang) via group id if available =====
    const key = String(p.group_id || p.canonical_id || '').trim();
    const alternates = [];
    const selfLang = viewPost.lang;
    const selfUrl = canonical + (canonical.includes('?') ? `&lng=${selfLang}` : `?lng=${selfLang}`);
    alternates.push({ lang: selfLang, url: selfUrl });

    if (key) {
      // try counterpart in the other language
      const otherLang = (selfLang === 'it') ? 'en' : 'it';
      const others = await fetchPublished(otherLang, 300);
      const match = others.find(q => String(q.group_id || q.canonical_id || '').trim() === key);
      if (match) {
        const otherAbs = `${baseUrl(req)}/news/${match.slug || match.id}` + `?lng=${otherLang}`;
        alternates.push({ lang: otherLang, url: otherAbs });
      }
    }
    const xdef = (alternates.find(a => a.lang === 'it') || alternates[0]);
    if (xdef) alternates.push({ lang: 'x-default', url: xdef.url });

    const title = `${viewPost.title} | ${L.title || (lang === 'en' ? 'News' : 'News')}`;
    const description = (viewPost.excerpt || String(p.content_md || '').slice(0, 160));
    const ogImage = viewPost.image || '/img/icons/favicon-180.png';

    const cssFiles = listPageCss('news');
    let pageScripts = [];
    const entry = havePageJs('news');
    if (entry) pageScripts.push(entry);
    const extras = await collectPageScripts();
    for (const s of extras) if (!pageScripts.includes(s)) pageScripts.push(s);

    return res.renderPage('pages/frontend/news-post', {
      layout: 'layouts/base-frontend',
      lang: viewPost.lang,
      labels: labelsAll,
      title,
      description,
      ogImage,
      pageMeta: { title, description, canonical },
      canonical,
      cssFiles,
      pageStyles: cssFiles,
      pageScripts,
      post: viewPost,
      related: (await fetchPublished(viewPost.lang, 50)).filter(q => q.id !== p.id).slice(0, 3).map(q => ({
        ...q,
        href: `/news/${q.slug || q.id}`,
        date: shortDate(q.published_at || q.created_at)
      })),
      url: canonical,
      alternates
    });
  } catch (err) {
    console.error('[newsController] getNewsArticle error:', err);
    const lang = normalizeLang(res.locals.lang || req.language || 'it', 'it');
    return res.status(500).renderPage('pages/frontend/maintenance', {
      layout: 'layouts/base-frontend',
      lang,
      title: (lang === 'en') ? 'Error loading post' : 'Errore caricando l\'articolo',
      description: ''
    });
  }
}

export async function feedXml(req, res) {
  try {
    const qLang = normalizeLang(req.query.lang, null);
    let lang = qLang || normalizeLang(res.locals.lang || req.language || 'it', 'it');

    const siteBase = baseUrl(req);
    let items = (await fetchPublished(lang, 200))
      .sort((a, b) => ts(b.published_at || b.updated_at || b.created_at) - ts(a.published_at || a.updated_at || a.created_at))
      .slice(0, 20);

    if (!items.length) {
      const fallback = (lang === 'it') ? 'en' : 'it';
      items = (await fetchPublished(fallback, 200)).slice(0, 20);
      if (items.length) lang = fallback;
    }

    const channelTitle = (res.locals?.labels?.news?.title) || 'News';
    const channelDesc  = (res.locals?.labels?.news?.claim) || '';
    const channelLink  = siteBase + '/news';
    const channelImage = siteBase + '/img/icons/favicon-180.png';

    const xmlItems = items.map(p => {
      const link = siteBase + `/news/${p.slug || p.id}`;
      const guid = link;
      const pubDate = rfc822(p.published_at || p.created_at);
      const description = xmlEscape(p.excerpt || '');
      const imageUrl = absolutize(siteBase, p.seo?.og_image || p.cover_url || '/img/icons/favicon-180.png');
      const contentHtml = `<div class=\"content-md\">${mdToHtml(p.content_md || '')}</div>`;
      return (
        `  <item>\n` +
        `    <title>${xmlEscape(p.title || '')}</title>\n` +
        `    <link>${link}</link>\n` +
        `    <guid isPermaLink=\"true\">${guid}</guid>\n` +
        `    <pubDate>${pubDate}</pubDate>\n` +
        `    <description>${description}</description>\n` +
        `    <enclosure url=\"${xmlEscape(imageUrl)}\" type=\"image/jpeg\" />\n` +
        `    <content:encoded><![CDATA[${contentHtml}]]></content:encoded>\n` +
        `  </item>`
      );
    }).join('\n');

    const xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n` +
`<rss version=\"2.0\" xmlns:content=\"http://purl.org/rss/1.0/modules/content/\">\n` +
`<channel>\n` +
`  <title>${xmlEscape(channelTitle)}</title>\n` +
`  <link>${channelLink}</link>\n` +
`  <description>${xmlEscape(channelDesc)}</description>\n` +
`  <language>${xmlEscape(lang)}</language>\n` +
`  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n` +
`  <image>\n` +
`    <url>${channelImage}</url>\n` +
`    <title>${xmlEscape(channelTitle)}</title>\n` +
`    <link>${channelLink}</link>\n` +
`  </image>\n` +
`${xmlItems}\n` +
`</channel>\n` +
`</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('[newsController] feedXml error:', err);
    return res.status(500).send('');
  }
}