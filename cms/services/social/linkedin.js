// cms/services/social/linkedin.js
// Adapter: LinkedIn Posts API (REST) — supports person OR organization author
// Contract: export async function publish(payload) -> { ok, post_id, permalink, error }
// No external deps (Node 20+ fetch)

const LI_REST_BASE = 'https://api.linkedin.com/rest';

function getEnv(name, fallback = '') {
  const v = process.env[name];
  return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
}

function sanitizeLinkedInVersion() {
  // LinkedIn expects a MONTHLY version like "202405" (YYYYMM).
  // If a daily form "YYYYMMDD" is provided, we cut to first 6 chars.
  // If invalid, default to a widely-available version.
  let v = getEnv('LINKEDIN_API_VERSION', '202405');
  v = String(v).trim();
  if (/^\d{8}$/.test(v)) v = v.slice(0, 6);
  if (!/^\d{6}$/.test(v)) v = '202405';
  return v;
}

function normalizeOrgUrn(orgIdOrUrn) {
  if (!orgIdOrUrn) return '';
  const s = String(orgIdOrUrn).trim();
  if (s.startsWith('urn:li:organization:')) return s;
  return `urn:li:organization:${s}`;
}
function makePersonUrn(personId) {
  const id = String(personId || '').trim();
  return id ? `urn:li:person:${id}` : '';
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

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': sanitizeLinkedInVersion()
  };
}

async function httpPost(url, token, bodyObj) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(bodyObj)
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!resp.ok) {
    const err = data?.message || data?.serviceErrorCode || data?.status || text || `HTTP ${resp.status}`;
    const rate = resp.headers.get('x-restli-rate-limit') || '';
    return { ok: false, status: resp.status, error: String(err), data, rate };
  }
  const id = data?.id || resp.headers.get('x-restli-id') || '';
  return { ok: true, status: resp.status, id, data };
}

async function httpGet(url, token) {
  const resp = await fetch(url, { headers: headers(token) });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!resp.ok) {
    const err = data?.message || data?.serviceErrorCode || data?.status || text || `HTTP ${resp.status}`;
    return { ok: false, status: resp.status, error: String(err), data };
  }
  return { ok: true, status: resp.status, data };
}

// Resolve author URN priority:
// 1) payload.providerOptions.authorUrn
// 2) env LINKEDIN_AUTHOR_URN
// 3) env LINKEDIN_ORG_ID -> urn:li:organization:<id>
// 4) Prefer GET /v2/userinfo (OpenID: requires openid/profile) -> urn:li:person:<sub>
//    Fallback to GET /v2/me when available (older apps with r_liteprofile) -> urn:li:person:<id>
async function resolveAuthorUrn(token, providerOptions = {}) {
  const optUrn = (providerOptions.authorUrn || '').trim();
  if (optUrn) return optUrn;

  const envUrn = getEnv('LINKEDIN_AUTHOR_URN');
  if (envUrn) return envUrn;

  const orgId = providerOptions.orgId || getEnv('LINKEDIN_ORG_ID');
  if (orgId) return normalizeOrgUrn(orgId);

  // fallback: person via OpenID userinfo (preferred with openid/profile/email scopes)
  const ui = await httpGet('https://api.linkedin.com/v2/userinfo', token);
  if (ui.ok && ui.data && (ui.data.sub || ui.data.id)) {
    return makePersonUrn(ui.data.sub || ui.data.id);
  }

  // legacy fallback: /v2/me (requires r_liteprofile on many apps)
  const me = await httpGet('https://api.linkedin.com/v2/me', token);
  if (me.ok && me.data && me.data.id) {
    return makePersonUrn(me.data.id);
  }
  return '';
}

function buildPostBody(payload, authorUrn) {
  // Commentary (testo del post)
  const message = String(payload?.message || '').slice(0, 2900);

  // Se l'URL non è pubblico (es. localhost), non alleghiamo l'articolo.
  const rawUrl = (payload?.url || '').trim();
  const hasPublicUrl = isPublicHttpUrl(rawUrl);
  const url = hasPublicUrl ? rawUrl : undefined;
  const title = payload?.title || undefined;

  // Base body
  const body = {
    author: authorUrn,
    commentary: message,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false
  };

  // Aggiungi contenuto articolo solo se URL è pubblico
  if (url) {
    body.content = { article: { source: url, title } };
  }

  return body;
}

async function getPermalinkFromUrn(postUrn, token) {
  if (!postUrn) return '';
  const url = `${LI_REST_BASE}/posts/${encodeURIComponent(postUrn)}?projection=(permalink)`;
  const res = await httpGet(url, token);
  if (!res.ok) return '';
  return res.data?.permalink || '';
}

/**
 * payload = {
 *   provider: 'linkedin',
 *   title, url, imageUrl, message, lang,
 *   providerOptions?: { orgId?: string, authorUrn?: string, accessToken?: string }
 * }
 */
export async function publish(payload = {}) {
  const token =
    payload?.providerOptions?.accessToken ||
    getEnv('LINKEDIN_ACCESS_TOKEN');

  if (!token) return { ok: false, error: 'linkedin_token_missing' };

  try {
    const authorUrn = await resolveAuthorUrn(token, payload?.providerOptions || {});
    if (!authorUrn) return { ok: false, error: 'linkedin_author_missing' };

    const body = buildPostBody(payload, authorUrn);
    const res = await httpPost(`${LI_REST_BASE}/posts`, token, body);
    if (!res.ok) {
      // Messaggi più chiari per casi comuni
      if (res.status === 403) {
        return { ok: false, error: 'linkedin_error: 403 (token lacks w_member_social or author not permitted)' };
      }
      if (res.status === 422) {
        return { ok: false, error: 'linkedin_error: 422 (invalid content; check URL/publicness and fields)' };
      }
      return { ok: false, error: `linkedin_error: ${res.error}` };
    }

    const postUrn = res.id || res.data?.id || '';
    const permalink = await getPermalinkFromUrn(postUrn, token);

    return { ok: true, post_id: postUrn, permalink, error: null };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}