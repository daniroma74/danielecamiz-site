// cms/services/social/facebook.js
// Adapter: Facebook Page post via Graph API (single or multi-page)
// Contract: export async function publish(payload) -> { ok, post_id?, permalink?, error?, pages? }
// No external deps (Node 20+ fetch)
//
// Option B supported:
// - Use one System User token (FB_SYSTEM_USER_TOKEN) and a list of target Page IDs (FB_TARGET_PAGE_IDS)
// - For each pageId we fetch a Page Access Token on the fly and post to /{pageId}/feed
//
// Fallbacks:
// - Single page via FB_PAGE_ID + FB_PAGE_TOKEN (legacy)
// - Per-call overrides via payload.providerOptions.{pageId, accessToken, pageIds[], systemUserToken, pageMessages{[pageId]:string}}

const GRAPH_BASE = 'https://graph.facebook.com';

// ------- ENV helpers
function getEnv(name, fallback = '') {
  const v = process.env[name];
  return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
}

function graphVersion() {
  return getEnv('FB_GRAPH_VERSION', 'v20.0');
}

function getSystemUserTokenFromEnv() {
  return (
    getEnv('FB_SYSTEM_USER_TOKEN') ||
    getEnv('FACEBOOK_SYSTEM_USER_TOKEN') ||
    ''
  );
}

// Read Page token from several conventional env names (legacy)
function getPageTokenFromEnv() {
  return (
    getEnv('FB_PAGE_TOKEN') ||
    getEnv('FACEBOOK_PAGE_ACCESS_TOKEN') ||
    getEnv('META_PAGE_ACCESS_TOKEN') ||
    ''
  );
}

// Read Page ID from several conventional env names (legacy)
function getPageIdFromEnv() {
  return (
    getEnv('FB_PAGE_ID') ||
    getEnv('FACEBOOK_PAGE_ID') ||
    getEnv('META_PAGE_ID') ||
    ''
  );
}

function parseTargetPageIdsFromEnv() {
  const raw = getEnv('FB_TARGET_PAGE_IDS', '');
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

// ------- URL + HTTP helpers
function buildUrl(path) {
  const v = graphVersion();
  const p = String(path || '').replace(/^\/+/, '');
  return `${GRAPH_BASE}/${v}/${p}`;
}

function isPublicHttpUrl(u = '') {
  try {
    const url = new URL(String(u));
    if (!/^https?:$/i.test(url.protocol)) return false;
    const h = url.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return false;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(h)) return false;
    if (h.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

async function httpPostForm(url, paramsObj) {
  const body = new URLSearchParams();
  Object.entries(paramsObj || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') body.append(k, String(v));
  });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!resp.ok) {
    const err = data?.error?.message || text || `HTTP ${resp.status}`;
    return { ok: false, status: resp.status, error: String(err), data };
  }
  return { ok: true, status: resp.status, data };
}

async function httpGet(url, paramsObj) {
  const u = new URL(url);
  Object.entries(paramsObj || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  });
  const resp = await fetch(u.toString(), { method: 'GET' });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!resp.ok) {
    const err = data?.error?.message || text || `HTTP ${resp.status}`;
    return { ok: false, status: resp.status, error: String(err), data };
  }
  return { ok: true, status: resp.status, data };
}

// ------- Graph helpers
async function getPageAccessToken(pageId, systemUserToken) {
  const url = buildUrl(`${pageId}`);
  const res = await httpGet(url, { fields: 'access_token', access_token: systemUserToken });
  if (!res.ok) {
    const code = res.data?.error?.code ? ` (code ${res.data.error.code})` : '';
    throw new Error(`page_token_error${code}: ${res.error}`);
  }
  const t = res.data?.access_token || '';
  if (!t) throw new Error('page_token_missing');
  return t;
}

async function postToPageFeed(pageId, accessToken, { message, link }) {
  const url = buildUrl(`${pageId}/feed`);
  // If link is empty, FB will create a text-only post.
  return httpPostForm(url, { message, link, access_token: accessToken });
}

async function getPermalink(objectId, accessToken) {
  const url = buildUrl(`${objectId}`);
  const res = await httpGet(url, { fields: 'permalink_url', access_token: accessToken });
  if (!res.ok) return '';
  return res.data?.permalink_url || '';
}

// ------- Publish (single or multi)
function normalizeMessage(msg) {
  return String(msg ?? '').slice(0, 5000); // hard cap
}

function pickPublicLink(raw) {
  const u = (raw || '').trim();
  return (u && isPublicHttpUrl(u)) ? u : '';
}

/**
 * payload = {
 *   provider: 'facebook',
 *   title, url, imageUrl, message, lang,
 *   providerOptions?: {
 *     // Single page legacy:
 *     pageId?: string, accessToken?: string,
 *     // Multi-page Option B:
 *     pageIds?: string[], systemUserToken?: string,
 *     // NEW per-page messages:
 *     pageMessages?: { [pageId: string]: string }
 *   }
 * }
 */
export async function publish(payload = {}) {
  // Compose base content
  const baseMessage = normalizeMessage(payload.message);
  const link = pickPublicLink(payload.url);

  // ---- Multi-page path (preferred Option B)
  const opt = payload?.providerOptions || {};
  const pageIds =
    (Array.isArray(opt.pageIds) && opt.pageIds.filter(Boolean)) ||
    parseTargetPageIdsFromEnv();

  // Per-page messages map (optional)
  const pageMessages = (opt && typeof opt.pageMessages === 'object' && opt.pageMessages) ? opt.pageMessages : null;

  if (pageIds && pageIds.length > 0) {
    const systemUserToken = opt.systemUserToken || getSystemUserTokenFromEnv();
    if (!systemUserToken) return { ok: false, error: 'facebook_system_user_token_missing' };

    const pages = [];
    for (const pid of pageIds) {
      try {
        const pageToken = await getPageAccessToken(pid, systemUserToken);

        // Message precedence: pageMessages[pid] -> baseMessage
        const msg = normalizeMessage(pageMessages && (pid in pageMessages) ? pageMessages[pid] : baseMessage);

        const res = await postToPageFeed(pid, pageToken, { message: msg, link });
        if (!res.ok) {
          const code = res.data?.error?.code ? ` (code ${res.data.error.code})` : '';
          pages.push({ pageId: pid, ok: false, error: `facebook_error${code}: ${res.error}` });
          continue;
        }
        const id = res.data?.id || '';
        let permalink = '';
        if (id) {
          try { permalink = await getPermalink(id, pageToken); } catch { permalink = ''; }
        }
        pages.push({ pageId: pid, ok: true, post_id: id, permalink });
      } catch (e) {
        pages.push({ pageId: pid, ok: false, error: String((e && e.message) || e) });
      }
    }
    const allOk = pages.every(p => p.ok);
    return { ok: allOk, pages };
  }

  // ---- Single page fallback (legacy env or per-call override)
  const accessToken =
    opt.accessToken ||
    getPageTokenFromEnv();

  const pageId =
    opt.pageId ||
    getPageIdFromEnv();

  if (!accessToken) return { ok: false, error: 'facebook_token_missing' };
  if (!pageId)      return { ok: false, error: 'facebook_page_missing' };

  try {
    const res = await postToPageFeed(pageId, accessToken, { message: baseMessage, link });
    if (!res.ok) {
      const code = res.data?.error?.code ? ` (code ${res.data.error.code})` : '';
      return { ok: false, error: `facebook_error${code}: ${res.error}` };
    }
    const id = res.data?.id || '';
    let permalink = '';
    if (id) {
      try { permalink = await getPermalink(id, accessToken); } catch { permalink = ''; }
    }
    return { ok: true, post_id: id, permalink, error: null };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}