// newsController.js (Admin)
import { getAdminCoreScripts, getAdminCoreStyles } from '../../utils/assetHelpers.js';
import { getPagination } from '../../utils/pagination.js';
import { isNonEmptyString } from '../../utils/validators.js';
import * as Store from '../../utils/newsStore.js';
import { auditLog } from '../../utils/auditLogger.js';
import { getCategories, getCategoryLabelMap } from '../../utils/newsCategories.js';
import { publishToProviders } from '../../services/social/index.js';
import { resolveFrontendImg } from '../../utils/mediaResolver.js';

/* ========= helpers ========= */
function escapeHtml(s=''){
  return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function safeBool(v){ return v === true || v === 1 || v === '1' || v === 'true'; }
function getBaseUrl(req){
  const env = process.env.SITE_BASE_URL && String(process.env.SITE_BASE_URL).trim();
  if (env) return env.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const host  = req.get('host');
  return `${proto}://${host}`;
}
function makeAbsolute(base, url){
  if (!url) return '';
  const u = String(url).trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;          // already absolute
  if (u.startsWith('//')) return `https:${u}`;      // schemeless → assume https
  const b = String(base || '').replace(/\/$/, '');
  const p = u.startsWith('/') ? u : `/${u}`;
  return `${b}${p}`;
}
function absoluteFromReq(req, url){
  const base = getBaseUrl(req);
  return makeAbsolute(base, url);
}
function nowISO(){ return new Date().toISOString(); }

function normalizeProviders(obj={}){
  const keys = ['linkedin','facebook','threads','mastodon','pinterest','instagram','x'];
  const out = {};
  keys.forEach(k => { out[k] = safeBool(obj[k]); });
  return out;
}
function normalizeOverrides(obj={}){
  const keys = ['linkedin','facebook','threads','mastodon','pinterest','instagram','x'];
  const out = {};
  keys.forEach(k => { out[k] = isNonEmptyString(obj[k]) ? String(obj[k]) : ''; });
  return out;
}
function buildSocialFromBody(body={}, existing=null){
  const current = existing && typeof existing === 'object' ? existing : {};
  const incoming = body.social || body || {};
  const social = {
    share_on_publish: (typeof incoming.share_on_publish !== 'undefined')
      ? safeBool(incoming.share_on_publish)
      : (current.share_on_publish || false),
    providers: Object.assign({}, normalizeProviders(current.providers || {}), normalizeProviders(incoming.providers || {})),
    message_overrides: Object.assign({}, normalizeOverrides(current.message_overrides || {}), normalizeOverrides(incoming.message_overrides || {})),
    status: Object.assign({}, current.status || {})
  };
  return social;
}

/* ========= Views ========= */
export async function renderList(req, res) {
  const { page, limit, offset } = getPagination(req.query, 20, 100);
  const { lang='', status='', q='' } = req.query;
  const { total, items } = Store.list({ lang, status, q, offset, limit });

  res.render('pages/admin/news-list', {
    layout: 'layouts/base-admin',
    pageMeta: { title: 'Admin – News', description: '' },
    labels: {}, lang: res.locals?.lang || 'it',
    pageStyles: getAdminCoreStyles(),
    pageScripts: [...getAdminCoreScripts(), '/admin/assets/js/news/list.js'],
    data: { items, total, page, limit, filters: { lang, status, q } }
  });
}

export async function renderNew(req, res) {
  const lang = res.locals?.lang || 'it';
  const categories = await getCategories(lang);
  res.render('pages/admin/news-edit', {
    layout: 'layouts/base-admin',
    pageMeta: { title: 'Nuovo Articolo', description: '' },
    labels: {}, lang,
    pageStyles: getAdminCoreStyles(),
    pageScripts: [...getAdminCoreScripts(), '/admin/assets/js/news/edit.js'],
    data: { post: null, categories }
  });
}

export async function renderEdit(req, res) {
  const post = Store.getById(req.params.id);
  if (!post) return res.status(404).send('Not found');
  const lang = res.locals?.lang || post.lang || 'it';
  const categories = await getCategories(lang);
  res.render('pages/admin/news-edit', {
    layout: 'layouts/base-admin',
    pageMeta: { title: 'Modifica Articolo', description: '' },
    labels: {}, lang,
    pageStyles: getAdminCoreStyles(),
    pageScripts: [...getAdminCoreScripts(), '/admin/assets/js/news/edit.js'],
    data: { post, categories }
  });
}

/* ========= APIs ========= */
export async function apiCreate(req, res) {
  try {
    const body = req.body || {};
    const lang = body.lang || 'it';

    // Resolve category label from id if needed
    const catMap = await getCategoryLabelMap(lang);
    const category_id = isNonEmptyString(body.category_id) ? String(body.category_id) : (isNonEmptyString(body.category) ? undefined : null);
    const category = isNonEmptyString(body.category)
      ? String(body.category)
      : (category_id ? (catMap[category_id] || '') : '');

    const social = buildSocialFromBody(body);

    const post = Store.create({
      lang,
      title: body.title || '',
      slug: (body.slug || '').trim(),
      excerpt: body.excerpt || '',
      content_md: body.content_md || '',
      cover_url: body.cover_url || '',
      status: body.status || 'draft',
      scheduled_at: body.scheduled_at || null,
      category_id: category_id || undefined,
      category: category || '', // legacy-friendly label
      tags: Array.isArray(body.tags) ? body.tags : (isNonEmptyString(body.tags) ? body.tags.split(',').map(s=>s.trim()).filter(Boolean) : []),
      seo: {
        meta_title: body.seo?.meta_title || '',
        meta_description: body.seo?.meta_description || '',
        og_image: body.seo?.og_image || ''
      },
      social
    });
    return res.json({ ok: true, post });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
}

export async function apiUpdate(req, res) {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const lang = body.lang || 'it';

    // Compute category updates if provided
    let category_id = undefined;
    if (typeof body.category_id !== 'undefined') {
      category_id = isNonEmptyString(body.category_id) ? String(body.category_id) : null; // allow clearing
    }
    let category = undefined;
    if (typeof body.category !== 'undefined') {
      category = isNonEmptyString(body.category) ? String(body.category) : '';
    } else if (typeof category_id !== 'undefined' && category_id) {
      const catMap = await getCategoryLabelMap(lang);
      category = catMap[category_id] || '';
    }

    // Merge social if provided
    let social = undefined;
    if (typeof body.social !== 'undefined' || typeof body.share_on_publish !== 'undefined' || typeof body.providers !== 'undefined') {
      const current = Store.getById(id) || {};
      social = buildSocialFromBody(body, current.social || {});
    }

    const post = Store.update(id, {
      lang: body.lang,
      title: body.title,
      slug: body.slug?.trim(),
      excerpt: body.excerpt,
      content_md: body.content_md,
      cover_url: body.cover_url,
      status: body.status,
      scheduled_at: body.scheduled_at,
      category_id, // may be undefined (no change) or null (clear)
      category,    // may be undefined (no change) or '' (clear/set)
      tags: Array.isArray(body.tags) ? body.tags : (isNonEmptyString(body.tags) ? body.tags.split(',').map(s=>s.trim()).filter(Boolean) : undefined),
      seo: body.seo,
      social
    });
    return res.json({ ok: true, post });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
}

export function apiDelete(req, res) {
  try {
    const id = req.params.id;
    Store.remove(id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
}

export async function apiPublish(req, res) {
  try {
    const id = req.params.id;
    let post = Store.publish(id);

    // Optional: share on publish (non-bloccante per l'utente, ma qui lo eseguiamo in try/catch)
    try {
      const s = post?.social || {};
      if (s.share_on_publish) {
        const providers = Object.entries(s.providers || {}).filter(([k,v]) => !!v).map(([k]) => k);
        if (providers.length) {
          const overrides = s.message_overrides || {};
          const baseUrl = getBaseUrl(req);
          const rawCover = post.cover_url || post.seo?.og_image || '';
          const normCover = resolveFrontendImg(rawCover) || rawCover;
          const absCover = makeAbsolute(baseUrl, normCover);
          const postForShare = {
            ...post,
            cover_url: absCover || post.cover_url || '',
            seo: { ...(post.seo || {}), og_image: absCover || (post.seo?.og_image || '') }
          };
          const results = await publishToProviders({ providers, post: postForShare, baseUrl, overrides });
          // persist status into post
          post.social = post.social || {}; post.social.status = post.social.status || {};
          for (const key of Object.keys(results)) {
            const r = results[key] || {};
            post.social.status[key] = {
              ok: !!r.ok,
              post_id: r.post_id || '',
              permalink: r.permalink || '',
              ts: nowISO(),
              error: r.ok ? '' : (r.error || 'unknown_error')
            };
          }
          try { post = Store.update(id, { social: post.social }); } catch {}
        }
      }
    } catch (shareErr) {
      // Non blocca la pubblicazione
      console.error('[admin/newsController] share_on_publish error:', shareErr);
      try { await auditLog('social_share_error', { id, error: String(shareErr?.message || shareErr) }); } catch {}
    }

    return res.json({ ok: true, post });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
}

export function apiDepublish(req, res) {
  try {
    const id = req.params.id;
    const post = Store.depublish(id);
    return res.json({ ok: true, post });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
}

export function apiDuplicate(req, res) {
  try {
    const id = req.params.id;
    const copy = Store.duplicate(id);
    return res.json({ ok: true, post: copy });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
}

// Preview SSR (con cover)
export function previewSSR(req, res) {
  const id = req.params.id;
  const post = Store.getById(id);
  if (!post) return res.status(404).send('Not found');

  const coverRaw = post.cover_url || post.seo?.og_image || '';
  const cover = resolveFrontendImg(coverRaw) || coverRaw;
  const coverAbs = absoluteFromReq(req, cover);
  const html = mdToHtml(post.content_md || '');

  res.send(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Preview – ${escapeHtml(post.title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
${coverAbs ? `<meta property="og:image" content="${coverAbs}">` : ''}
<style>
  body{font:16px/1.55 -apple-system,Segoe UI,Roboto,Arial;padding:24px;max-width:900px;margin:0 auto;background:#111;color:#ddd}
  h1{margin:.2rem 0 0}
  .excerpt{color:#aaa;margin:.2rem 0 1rem}
  .hero{margin:0 0 1rem}
  .hero img{display:block;max-width:100%;height:auto;border-radius:12px;border:1px solid #222}
  hr{border:0;border-top:1px solid #222;margin:1rem 0}
  a{color:#daa520}
</style>
</head><body>
  <header>
    <h1>${escapeHtml(post.title)}</h1>
    ${post.excerpt ? `<p class="excerpt"><em>${escapeHtml(post.excerpt)}</em></p>` : ''}
    ${coverAbs ? `<div class="hero"><img src="${coverAbs}" alt="${escapeHtml(post.title)}"></div>` : ''}
  </header>
  <main>${html}</main>
</body></html>`);
}

/* ========== EXPORT NEWSLETTER (HTML/JSON) ========== */
export function exportNewsletter(req, res) {
  const id = req.params.id;
  const format = String(req.params.format || 'html').toLowerCase();
  const post = Store.getById(id);
  if (!post) return res.status(404).send('Not found');

  if (format === 'json') {
    const coverRaw = post.cover_url || post.seo?.og_image || '';
    const cover = resolveFrontendImg(coverRaw) || coverRaw;
    const coverAbs = absoluteFromReq(req, cover);
    const payload = {
      title: post.title,
      lang: post.lang || 'it',
      date: (post.published_at || post.created_at || '').slice(0,10),
      excerpt: post.excerpt || '',
      cover_url: coverAbs,
      content_html: stripDocHtml(mdToHtml(post.content_md || '')),
      seo: {
        title: post.seo?.meta_title || post.title,
        description: post.seo?.meta_description || post.excerpt || '',
        og_image: coverAbs
      },
      tags: post.tags || []
    };
    const fname = `newsletter-${(post.slug || 'post')}-${post.lang || 'it'}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    return res.status(200).json(payload);
  }

  // default: html
  const html = buildNewsletterHTML(post, req);
  const fname = `newsletter-${(post.slug || 'post')}-${post.lang || 'it'}.html`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  return res.status(200).send(html);
}

/* ===== Helpers (markdown/newsletter) ===== */
// piccolo markdown→html (coerente con preview)
function mdToHtml(src=''){
  let s = String(src);
  s = escapeHtml(s);
  s = s.replace(/^######\s?(.*)$/gm,'<h6>$1</h6>')
       .replace(/^#####\s?(.*)$/gm,'<h5>$1</h5>')
       .replace(/^####\s?(.*)$/gm,'<h4>$1</h4>')
       .replace(/^###\s?(.*)$/gm,'<h3>$1</h3>')
       .replace(/^##\s?(.*)$/gm,'<h2>$1</h2>')
       .replace(/^#\s?(.*)$/gm,'<h1>$1</h1>');
  s = s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g,'<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\n{2,}/g,'\n\n').split('\n\n').map(p => `<p>${p.replace(/\n/g,'<br/>')}</p>`).join('');
  return s;
}
// toglie l'involucro newsletter quando esportiamo JSON
function stripDocHtml(inner=''){
  return String(inner).trim();
}
function buildNewsletterHTML(post, req){
  const title = escapeHtml(post.title || '');
  const excerpt = escapeHtml(post.excerpt || '');
  const coverRaw = post.cover_url || post.seo?.og_image || '';
  const cover = resolveFrontendImg(coverRaw) || coverRaw;
  const coverAbs = absoluteFromReq(req, cover);
  const body = mdToHtml(post.content_md || '');
  return `<!DOCTYPE html>
<html lang="${post.lang || 'it'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{margin:0;background:#f5f5f5;font:16px/1.5 -apple-system,Segoe UI,Roboto,Arial;color:#222}
  .wrap{max-width:720px;margin:0 auto;padding:24px}
  .card{background:#fff;border-radius:12px;border:1px solid #e6e6e6;overflow:hidden}
  .head{padding:20px 20px 0}
  .title{font-size:26px;margin:0 0 6px}
  .excerpt{color:#666;margin:0 0 12px}
  .cover img{display:block;width:100%;height:auto}
  .content{padding:20px}
  .content h1,.content h2,.content h3{margin:1rem 0 .5rem}
  .content p{margin:.6rem 0}
  .footer{padding:16px 20px;color:#888;font-size:13px;border-top:1px solid #eee}
  a{color:#B8860B}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="head">
        <h1 class="title">${title}</h1>
        ${excerpt ? `<p class="excerpt">${excerpt}</p>` : ``}
      </div>
      ${coverAbs ? `<div class="cover"><img src="${coverAbs}" alt=""></div>` : ``}
      <div class="content">${body}</div>
      <div class="footer">
        Bozza newsletter – ${escapeHtml((post.published_at || post.created_at || '').slice(0,10))}
      </div>
    </div>
  </div>
</body>
</html>`;
}