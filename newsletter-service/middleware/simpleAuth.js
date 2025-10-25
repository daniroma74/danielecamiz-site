// middleware/simpleAuth.js
import crypto from 'crypto';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'newsletter2025';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || ''; // opzionale (sha256 esadecimale)

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function checkPassword(pw) {
  if (ADMIN_PASSWORD_HASH) return hashPassword(pw) === ADMIN_PASSWORD_HASH;
  return pw === ADMIN_PASSWORD;
}

export function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated === true) return next();
  req.session.returnTo = req.originalUrl;
  return res.redirect('/auth/login');
}

export function showLogin(req, res) {
  if (req.session && req.session.authenticated === true) {
    return res.redirect('/admin');
  }
  const err = req.query.error === 'invalid' ? 'Credenziali non valide' : null;
  res.render('pages/login', {
    title: 'Login - Newsletter Admin',
    error: err,
    returnTo: req.session.returnTo || '/admin'
  });
}

export function processLogin(req, res) {
  const { username, password } = req.body || {};
  const ok = username === ADMIN_USERNAME && checkPassword(password || '');
  if (ok) {
    req.session.authenticated = true;
    req.session.username = username;
    req.session.loginTime = new Date().toISOString();
    const dest = req.session.returnTo || '/admin';
    delete req.session.returnTo;
    return res.redirect(dest);
  }
  return res.redirect('/auth/login?error=invalid');
}

export function processLogout(req, res) {
  // azzera la sessione tramite helper del sessionLite
  if (typeof res.clearSession === 'function') res.clearSession();
  return res.redirect('/auth/login');
}
