// cms/routes/admin/socialRoutes.js
// Routes to share News posts to social providers from Admin

import express from 'express';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';
import { publishToProviders } from '../../services/social/index.js';
import * as Store from '../../utils/newsStore.js';

const router = express.Router();

function baseUrl(req) {
  const env = process.env.SITE_BASE_URL && String(process.env.SITE_BASE_URL).trim();
  if (env) return env.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const host = req.get('host');
  return `${proto}://${host}`;
}

function ts() { return new Date().toISOString(); }

function findPostFlexible(idOrSlug) {
  if (!idOrSlug) return null;
  if (typeof Store.getById === 'function') {
    const byId = Store.getById(idOrSlug);
    if (byId) return byId;
  }
  if (typeof Store.getByIdOrSlug === 'function') {
    const any = Store.getByIdOrSlug(idOrSlug, {});
    if (any) return any;
  }
  if (typeof Store.all === 'function') {
    const all = Store.all() || [];
    const hit = all.find(p => p.id === idOrSlug || p.slug === idOrSlug);
    if (hit) return hit;
  }
  return null;
}

async function savePostFlexible(post) {
  if (!post) return false;
  if (typeof Store.update === 'function') { await Store.update(post.id, post); return true; }
  if (typeof Store.save === 'function')   { await Store.save(post); return true; }
  if (typeof Store.upsert === 'function') { await Store.upsert(post); return true; }
  return false;
}

// ---------- Helpers
function q(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

function getEnv(name, fallback = '') {
  const v = process.env[name];
  return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
}

function parseCsvIds(csv = '') {
  return String(csv || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function graphVersion() {
  return getEnv('FB_GRAPH_VERSION', 'v20.0');
}
function buildFbUrl(path) {
  const p = String(path || '').replace(/^\/+/, '');
  return `https://graph.facebook.com/${graphVersion()}/${p}`;
}

// ---------- Share endpoint
// POST /admin/news/:id/share
// Body: {
//   providers: ["linkedin","facebook","threads"],
//   overrides?: { linkedin?: "...", facebook?: "...", threads?: "..." }, // messages per provider
//   providerOptions?: { linkedin?: {...}, facebook?: {...}, threads?: {...} } // e.g. facebook: { pageIds:[], pageMessages:{[id]:text} }
// }
router.post('/news/:id/share', ensureAuthenticated, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const providersRaw = Array.isArray(req.body?.providers) ? req.body.providers : [];
    const overrides = (req.body?.overrides && typeof req.body.overrides === 'object') ? req.body.overrides : {};
    const providerOptions = (req.body?.providerOptions && typeof req.body.providerOptions === 'object') ? req.body.providerOptions : {};

    if (!id) return res.status(400).json({ error: 'missing_id' });
    if (!providersRaw.length) return res.status(400).json({ error: 'missing_providers' });

    const post = findPostFlexible(id);
    if (!post) return res.status(404).json({ error: 'post_not_found' });

    // Keep overrides (messages) and providerOptions (advanced params) SEPARATE.
    // Do NOT merge providerOptions into overrides, to avoid turning strings into objects (causes [object Object] in posts).
    const providers = providersRaw.map(p => String(p || '').toLowerCase()).filter(Boolean);

    const results = await publishToProviders({
      providers,
      post,
      baseUrl: baseUrl(req),
      overrides,        // message overrides per provider (string)
      providerOptions   // advanced options per provider (e.g., facebook pageIds/pageMessages)
    });

    // Persist back
    post.social = post.social || {};
    post.social.status = post.social.status || {};

    for (const key of Object.keys(results)) {
      const r = results[key] || {};
      post.social.status[key] = {
        ok: !!r.ok,
        post_id: r.post_id || '',
        permalink: r.permalink || '',
        ts: ts(),
        error: r.ok ? '' : (r.error || 'unknown_error')
      };
      // Multi-page (facebook) reporting: keep last high-level, but attach details
      if (key === 'facebook' && Array.isArray(r.pages)) {
        post.social.status[key].pages = r.pages;
      }
    }

    try { await savePostFlexible(post); } catch {}

    return res.json({ ok: true, results });
  } catch (err) {
    console.error('[admin/socialRoutes] share error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ---------- Facebook: list pages by IDs (Option B helper)
// GET /admin/social/facebook/pages
// Query (optional): ?ids=123,456 (override FB_TARGET_PAGE_IDS)
router.get('/social/facebook/pages', ensureAuthenticated, async (req, res) => {
  try {
    const ids = parseCsvIds(req.query.ids || getEnv('FB_TARGET_PAGE_IDS', ''));
    const systemToken = getEnv('FB_SYSTEM_USER_TOKEN', '');
    if (!ids.length) return res.status(400).json({ ok: false, error: 'no_page_ids_configured' });
    if (!systemToken) return res.status(400).json({ ok: false, error: 'facebook_system_user_token_missing' });

    const pages = [];
    for (const id of ids) {
      try {
        const u = new URL(buildFbUrl(id));
        u.searchParams.set('fields', 'name');
        u.searchParams.set('access_token', systemToken);
        const resp = await fetch(u.toString(), { method: 'GET' });
        const text = await resp.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = null; }
        if (!resp.ok) {
          const err = data?.error?.message || text || `HTTP ${resp.status}`;
          pages.push({ id, ok: false, error: String(err) });
          continue;
        }
        pages.push({ id, ok: true, name: data?.name || id });
      } catch (e) {
        pages.push({ id, ok: false, error: String((e && e.message) || e) });
      }
    }

    const allOk = pages.every(p => p.ok);
    return res.json({ ok: allOk, pages });
  } catch (e) {
    console.error('[admin/socialRoutes] /social/facebook/pages error:', e);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

// ---------- Threads OAuth (implicit) callback
// GET /admin/social/oauth/threads/callback
router.get('/social/oauth/threads/callback', (req, res) => {
  const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Threads OAuth Callback</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; line-height: 1.4; }
    .box { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-top: 12px; }
    textarea { width: 100%; height: 120px; }
    code, pre { background: #f6f8fa; padding: 8px; border-radius: 6px; display: block; overflow-x: auto; }
    .ok { color: #0a7f2e; }
    .err { color: #b00020; }
    button { padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; background:#fff; cursor:pointer; }
  </style>
</head>
<body>
  <h1>Threads OAuth – Token ricevuto</h1>
  <p id="status">Lettura del token in corso…</p>

  <div class="box" id="okbox" style="display:none">
    <p class="ok"><strong>Token acquisito.</strong> Copialo nel file <code>.env</code> come <code>THREADS_ACCESS_TOKEN</code>.</p>
    <label for="tok"><strong>Access Token</strong></label>
    <textarea id="tok" readonly></textarea>
    <p><button id="copyBtn">Copia token</button></p>

    <h3>Test rapido (terminal)</h3>
    <pre id="curl"></pre>

    <p>Per ottenere il tuo <code>THREADS_USER_ID</code>:</p>
    <pre id="curlUser"></pre>
  </div>

  <div class="box err" id="errbox" style="display:none">
    <p><strong>Errore OAuth.</strong></p>
    <pre id="errpre"></pre>
  </div>

  <script>
    (function () {
      function qs(id){ return document.getElementById(id); }
      var hash = (window.location.hash || '').replace(/^#/, '');
      var params = new URLSearchParams(hash);
      var token = params.get('access_token');
      var error = params.get('error') || params.get('error_reason') || params.get('error_description');

      if (error) {
        qs('status').textContent = 'Errore durante l\\'autorizzazione.';
        qs('errpre').textContent = String(error);
        qs('errbox').style.display = 'block';
        return;
      }

      if (!token) {
        qs('status').textContent = 'Nessun token trovato nell\\'URL.';
        qs('errbox').style.display = 'block';
        qs('errpre').textContent = window.location.href;
        return;
      }

      qs('status').textContent = 'Token acquisito.';
      qs('okbox').style.display = 'block';
      qs('tok').value = token;

      var curl = 'curl "https://graph.threads.net/v1.0/me?fields=id,username&amp;access_token=' + token + '"';
      qs('curl').textContent = curl;

      var curlUser = 'curl "https://graph.threads.net/v1.0/me?fields=id,username&amp;access_token=' + token + '"';
      qs('curlUser').textContent = curlUser;

      var copyBtn = qs('copyBtn');
      copyBtn.addEventListener('click', function(){
        var ta = qs('tok');
        ta.focus();
        ta.select();
        try {
          var ok = document.execCommand('copy');
          copyBtn.textContent = ok ? 'Copiato!' : 'Copia non riuscita';
          setTimeout(function(){ copyBtn.textContent = 'Copia token'; }, 1500);
        } catch(e) {
          copyBtn.textContent = 'Copia non riuscita';
        }
      });

      try { if (window.opener) { window.opener.postMessage({ provider: 'threads', access_token: token }, '*'); } } catch(e) {}
    })();
  </script>
</body>
</html>`;
  res.set('Content-Type', 'text/html; charset=utf-8').send(html);
});

// ---------- LinkedIn OAuth (authorization code)
// GET /admin/social/oauth/linkedin/start
router.get('/social/oauth/linkedin/start', ensureAuthenticated, (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${baseUrl(req)}/admin/social/oauth/linkedin/callback`;
  const scope = 'w_member_social openid profile email'; // <-- updated scopes
  if (!clientId) return res.status(500).send('LINKEDIN_CLIENT_ID non configurato.');
  const url = `https://www.linkedin.com/oauth/v2/authorization?${q({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope
  })}`;
  return res.redirect(url);
});

// GET /admin/social/oauth/linkedin/callback
router.get('/social/oauth/linkedin/callback', async (req, res) => {
  const { code, error, error_description } = req.query || {};
  if (error) {
    return res
      .status(400)
      .send(`<pre>Errore OAuth LinkedIn: ${String(error)}\n${String(error_description || '')}</pre>`);
  }
  if (!code) return res.status(400).send('<pre>Manca il parametro "code".</pre>');

  try {
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${baseUrl(req)}/admin/social/oauth/linkedin/callback`;
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || ''
    });

    const resp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const data = await resp.json();

    if (!resp.ok) {
      return res.status(400).send(`<pre>Exchange token fallito:\n${JSON.stringify(data, null, 2)}</pre>`);
    }

    const token = data.access_token;
    const expiresIn = data.expires_in;

    const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<title>LinkedIn OAuth – Token</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
 body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding:24px; line-height:1.4; }
 .box { border:1px solid #ddd; border-radius:8px; padding:16px; }
 textarea { width:100%; height:140px; }
 code, pre { background:#f6f8fa; padding:8px; border-radius:6px; display:block; overflow-x:auto; }
 button { padding:8px 12px; border:1px solid #ccc; border-radius:6px; background:#fff; cursor:pointer; }
</style>
</head>
<body>
  <h1>LinkedIn – Access Token ottenuto</h1>
  <p>Scadenza: ${expiresIn} secondi (~${Math.round(expiresIn/3600)}h).</p>
  <div class="box">
    <label><strong>Access Token</strong></label>
    <textarea readonly id="tok">${token}</textarea>
    <p><button id="copy">Copia token</button></p>
  </div>

  <h3>Test rapido (terminal)</h3>
  <pre>curl -H "Authorization: Bearer ${token}" -H "LinkedIn-Version: ${process.env.LINKEDIN_API_VERSION || '202405'}" https://api.linkedin.com/v2/userinfo</pre>

  <script>
    document.getElementById('copy').addEventListener('click', function(){
      const ta = document.getElementById('tok'); ta.focus(); ta.select();
      try { document.execCommand('copy'); this.textContent = 'Copiato!'; } catch(e) { this.textContent = 'Errore copia'; }
      setTimeout(()=> this.textContent='Copia token', 1500);
    });
  </script>
</body>
</html>`;
    return res.set('Content-Type', 'text/html; charset=utf-8').send(html);
  } catch (e) {
    console.error('LinkedIn callback error', e);
    return res.status(500).send('<pre>Errore interno durante l\'exchange token.</pre>');
  }
});

// ---------- Quick token checks (JSON)
// GET /admin/social/test/:provider  -> provider: facebook | threads | linkedin
router.get('/social/test/:provider', ensureAuthenticated, async (req, res) => {
  const p = String(req.params.provider || '').toLowerCase();
  try {
    if (p === 'threads') {
      const token = process.env.THREADS_ACCESS_TOKEN;
      if (!token) return res.status(400).json({ ok: false, error: 'THREADS_ACCESS_TOKEN missing' });
      const r = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(token)}`);
      const j = await r.json();
      return res.json({ ok: r.ok, status: r.status, data: j });
    }
    if (p === 'linkedin') {
      const token = req.query.access_token || process.env.LINKEDIN_ACCESS_TOKEN;
      if (!token) return res.status(400).json({ ok: false, error: 'Provide ?access_token=... or set LINKEDIN_ACCESS_TOKEN' });
      const r = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202405'
        }
      });
      const j = await r.json();
      return res.json({ ok: r.ok, status: r.status, data: j });
    }
    if (p === 'facebook') {
      const token = process.env.FB_PAGE_TOKEN || process.env.FB_SYSTEM_USER_TOKEN;
      if (!token) return res.status(400).json({ ok: false, error: 'FB_PAGE_TOKEN or FB_SYSTEM_USER_TOKEN missing' });
      const target = process.env.FB_PAGE_TOKEN ? 'me' : 'app';
      const url = process.env.FB_PAGE_TOKEN
        ? `https://graph.facebook.com/${graphVersion()}/me?fields=id,name,link&access_token=${encodeURIComponent(token)}`
        : `https://graph.facebook.com/${graphVersion()}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`;
      const r = await fetch(url);
      const j = await r.json();
      const pageIdsEnv = getEnv('FB_TARGET_PAGE_IDS', null);
      return res.json({ ok: r.ok, status: r.status, target, data: j, page_ids_env: pageIdsEnv });
    }
    return res.status(400).json({ ok: false, error: 'unknown_provider' });
  } catch (e) {
    console.error('social test error', e);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

export default router;