// cms/services/social/threads.js
// Adapter: Threads (Meta) via graph.threads.net
// Contract: export async function publish(payload) -> { ok, post_id, permalink, error }
// No external deps (Node 20+ fetch)
// Flow: create container -> publish (POST /{user-id}/threads, then /{user-id}/threads_publish)

function getEnv(name, fallback = '') {
  const v = process.env[name];
  return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
}

function graphBase() {
  return getEnv('THREADS_API_BASE', 'https://graph.threads.net');
}

function graphVersion() {
  // Threads public API default
  return getEnv('THREADS_API_VERSION', 'v1.0');
}

function buildUrl(path) {
  const base = graphBase().replace(/\/$/, '');
  const v = graphVersion();
  const p = String(path || '').replace(/^\/+/, '');
  return `${base}/${v}/${p}`;
}

function isHttpUrl(u = '') { return /^https?:\/\//i.test(String(u)); }

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

async function httpGet(url, paramsObj) {
  const u = new URL(url);
  Object.entries(paramsObj || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
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

async function httpPostForm(url, paramsObj) {
  const body = new URLSearchParams();
  Object.entries(paramsObj || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) body.append(k, String(v));
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

async function resolveUserId(token, fallbackUserId) {
  const user = (fallbackUserId && String(fallbackUserId).trim()) || '';
  if (user) return user;
  // Try /me to resolve from token
  const res = await httpGet(buildUrl('me'), { access_token: token, fields: 'id' });
  if (!res.ok) return '';
  return res.data?.id || '';
}

/**
 * Build final text:
 * - prefer payload.message
 * - fallback to payload.title
 * - ensure non-empty (Threads TEXT requires text)
 * - append a public URL if available and not already included
 * - append hashtags (#tag) if provided
 */
function buildPostText(payload, maxLen = Number(getEnv('THREADS_MAX_TEXT', '5000'))) {
  let base = String(payload?.message || '').trim();
  if (!base) base = String(payload?.title || '').trim();
  if (!base) base = 'Aggiornamento'; // safety: must not be empty

  const rawUrl = (payload?.url || '').trim();
  const url = rawUrl && isPublicHttpUrl(rawUrl) ? rawUrl : '';
  // Avoid appending localhost/private URLs that can break Threads publishing
  if (url && !base.includes(url)) {
    base = base ? `${base}\n\n${url}` : url;
  }

  if (Array.isArray(payload?.tags) && payload.tags.length) {
    const tags = payload.tags
      .map(t => String(t || '').trim().replace(/\s+/g, ''))
      .filter(Boolean)
      .map(t => (t.startsWith('#') ? t : `#${t}`));
    if (tags.length) {
      const suffix = `\n\n${tags.join(' ')}`;
      const room = Math.max(0, maxLen - suffix.length);
      base = base.slice(0, room) + suffix;
    }
  }
  return base.slice(0, maxLen);
}

async function createContainer(userId, token, { text, imageUrl }) {
  const url = buildUrl(`${encodeURIComponent(userId)}/threads`);
  const params = { access_token: token };
  // Always provide media_type as required by Threads API
  if (imageUrl && isPublicHttpUrl(imageUrl)) {
    params.media_type = 'IMAGE';
    params.image_url  = imageUrl;
    if (text) params.text = text; // optional caption
  } else {
    params.media_type = 'TEXT';
    params.text = (text && text.trim()) ? text : 'Aggiornamento';
    // Optional: enable one-step publish if desired via env flag
    if (getEnv('THREADS_AUTO_PUBLISH_TEXT', '0') === '1') {
      params.auto_publish_text = 'true';
    }
  }
  return httpPostForm(url, params);
}

async function publishContainer(userId, token, creationId) {
  const url = buildUrl(`${encodeURIComponent(userId)}/threads_publish`);
  return httpPostForm(url, { creation_id: creationId, access_token: token });
}

async function getPermalink(objectId, token) {
  // Permalink may not be immediately available; best-effort
  const url = buildUrl(`${encodeURIComponent(objectId)}`);
  const res = await httpGet(url, { access_token: token, fields: 'permalink_url' });
  if (!res.ok) return '';
  return res.data?.permalink_url || '';
}

/**
 * payload = {
 *   provider: 'threads',
 *   title, url, imageUrl, message, lang, tags?: string[],
 *   providerOptions?: { userId?: string, accessToken?: string }
 * }
 */
export async function publish(payload = {}) {
  const token = payload?.providerOptions?.accessToken || getEnv('THREADS_ACCESS_TOKEN');
  let userId   = payload?.providerOptions?.userId || getEnv('THREADS_USER_ID');

  if (!token) return { ok: false, error: 'threads_token_missing' };
  try {
    userId = await resolveUserId(token, userId);
    if (!userId) return { ok: false, error: 'threads_user_missing' };

    // Build text (message + url + optional hashtags) with cap
    const text = buildPostText(payload);
    const imageUrl = (payload.imageUrl && isPublicHttpUrl(payload.imageUrl)) ? payload.imageUrl : '';

    const c = await createContainer(userId, token, { text, imageUrl });
    if (!c.ok) {
      const e = c.data?.error || {};
      const detail = [e.type, e.code, e.error_subcode, e.message].filter(Boolean).join(' | ');
      return { ok: false, error: `threads_error_container: ${detail || c.error}` };
    }

    // If we requested auto_publish_text, some responses may already represent a published object or start async publish.
    // We still prefer explicit publish when possible; however, if auto_publish_text is enabled, try to fetch a permalink fallback.
    const autoPublish = getEnv('THREADS_AUTO_PUBLISH_TEXT', '0') === '1' && (!imageUrl);
    if (autoPublish) {
      const maybeId = c.data?.id || '';
      if (maybeId) {
        try {
          const permalink = await getPermalink(maybeId, token);
          if (permalink) {
            return { ok: true, post_id: maybeId, permalink, error: null };
          }
        } catch {}
      }
      // Fallthrough to explicit publish if permalink is not yet available.
    }

    const creationId = c.data?.id || '';
    if (!creationId) return { ok: false, error: 'threads_creation_id_missing' };

    const p = await publishContainer(userId, token, creationId);
    if (!p.ok) {
      const e = p.data?.error || {};
      const detail = [e.type, e.code, e.error_subcode, e.message].filter(Boolean).join(' | ');
      return { ok: false, error: `threads_error_publish: ${detail || p.error}` };
    }

    const postId = p.data?.id || '';
    let permalink = '';
    if (postId) {
      try { permalink = await getPermalink(postId, token); } catch {}
    }

    return { ok: true, post_id: postId, permalink, error: null };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}