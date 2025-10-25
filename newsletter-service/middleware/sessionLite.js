// middleware/sessionLite.js
import crypto from 'crypto';

export default function sessionLite(options = {}) {
  const store = new Map();
  const cookieName = options.cookieName || 'nsid';
  const ttlSec = Number(options.ttlSec || 60 * 60 * 4); // 4h
  const isProd = process.env.NODE_ENV === 'production';

  function parseCookies(header) {
    const out = {};
    if (!header) return out;
    header.split(';').forEach(p => {
      const [k, v] = p.split('=');
      if (!k) return;
      out[k.trim()] = decodeURIComponent((v || '').trim());
    });
    return out;
  }

  function setCookie(res, name, value, maxAgeSec) {
    const parts = [
      `${name}=${encodeURIComponent(value)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax'
    ];
    if (isProd) parts.push('Secure');
    if (typeof maxAgeSec === 'number') parts.push(`Max-Age=${maxAgeSec}`);
    res.appendHeader
      ? res.appendHeader('Set-Cookie', parts.join('; '))
      : res.setHeader('Set-Cookie', parts.join('; '));
  }

  return function sessionMiddleware(req, res, next) {
    const cookies = parseCookies(req.headers.cookie || '');
    let sid = cookies[cookieName];
    if (!sid) {
      sid = crypto.randomBytes(16).toString('hex');
      setCookie(res, cookieName, sid, ttlSec);
    }

    let rec = store.get(sid);
    if (!rec || (rec.expiresAt && rec.expiresAt < Date.now())) {
      rec = { data: {}, expiresAt: Date.now() + ttlSec * 1000 };
      store.set(sid, rec);
      setCookie(res, cookieName, sid, ttlSec);
    }

    // API compatibile con req.session
    req.session = rec.data;

    // helper per logout
    res.clearSession = () => {
      store.delete(sid);
      setCookie(res, cookieName, '', 0);
    };

    // touch a ogni richiesta
    rec.expiresAt = Date.now() + ttlSec * 1000;
    next();
  };
}
