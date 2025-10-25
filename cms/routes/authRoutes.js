import express from 'express';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single admin user (demo) + 2FA secret loaded from file
let adminUser = {
  username: 'admin',
  passwordHash: '$2b$10$ZlJbhbRcSRDYQ0Y0VOJR6uiepNJm9gIWGT/9ESCzU1uT.m8gWvjfi', // esempio
  twoFASecret: ''
};

async function loadSecret() {
  try {
    const secretPath = path.join(__dirname, '..', 'config', '2fa-secret.json');
    const data = await fs.readFile(secretPath, 'utf8');
    const json = JSON.parse(data);
    adminUser.twoFASecret = json.secret || '';
  } catch (e) {
    console.error('Errore caricando chiave 2FA:', e);
  }
}
loadSecret();

// Helpers
function isInternalPath(p) {
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/auth');
}
function getReturnTo(req) {
  const cand = req.session?.returnTo || req.query?.next || req.body?.next || req.get('Referer');
  return isInternalPath(cand) ? cand : '/admin';
}
function saveAndRedirect(req, res, to) {
  return req.session.save(err => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).send('Errore di sessione');
    }
    return res.redirect(to);
  });
}

/* GET /auth/login */
router.get('/login', (req, res) => {
  // Se già loggato e (2FA disattivata o verificata), vai a destinazione
  const disable2FA = process.env.ADMIN_DISABLE_2FA === '1';
  const user = req.session?.user;
  if (user && (disable2FA || user.is2faVerified === true)) {
    const dest = getReturnTo(req);
    if (req.session) delete req.session.returnTo;
    return res.redirect(dest);
  }

  // Memorizza destinazione se arriva ?next= o Referer (solo path interni)
  const next = req.query?.next || req.get('Referer');
  if (isInternalPath(next) && req.session) req.session.returnTo = next;

  // Vista minimal (fuori layout principale)
  return res.render('pages/admin/admin-login', { layout: false });
});

/* POST /auth/login */
router.post('/login', async (req, res) => {
  const { username, password, next } = req.body || {};
  if (username !== adminUser.username) {
    return res.status(401).send('Credenziali errate');
  }
  const match = await bcrypt.compare(password || '', adminUser.passwordHash);
  if (!match) {
    return res.status(401).send('Credenziali errate');
  }

  const disable2FA = process.env.ADMIN_DISABLE_2FA === '1';
  const require2FA = process.env.REQUIRE_2FA === '1' && !disable2FA;

  // Inizializza sessione utente coerente con ensureAuthenticated
  req.session.user = {
    username,
    is2faVerified: disable2FA || !require2FA ? true : false
  };
  // Flags legacy per compatibilità massima
  req.session.isAuthenticated = true;
  req.session.loggedIn = true;

  // Se fornito next interno, memorizzalo come destinazione
  if (isInternalPath(next)) req.session.returnTo = next;

  if (require2FA && !req.session.user.is2faVerified) {
    // Passa allo step 2FA
    return saveAndRedirect(req, res, '/auth/2fa');
  }

  const dest = getReturnTo(req);
  if (req.session) delete req.session.returnTo;
  return saveAndRedirect(req, res, dest);
});

/* GET /auth/2fa */
router.get('/2fa', (req, res) => {
  const disable2FA = process.env.ADMIN_DISABLE_2FA === '1';
  const user = req.session?.user;
  if (!user) return res.redirect('/auth/login');
  if (disable2FA || user.is2faVerified === true) {
    const dest = getReturnTo(req);
    if (req.session) delete req.session.returnTo;
    return res.redirect(dest);
  }
  return res.render('pages/admin/admin-2fa', { layout: false });
});

/* POST /auth/2fa */
router.post('/2fa', (req, res) => {
  const { token } = req.body || {};
  const user = req.session?.user;
  if (!user) return res.redirect('/auth/login');

  const verified = speakeasy.totp.verify({
    secret: adminUser.twoFASecret,
    encoding: 'base32',
    token,
    window: 1
  });

  if (!verified) {
    return res.status(401).send('Token 2FA errato');
  }

  req.session.user.is2faVerified = true;
  const dest = getReturnTo(req);
  if (req.session) delete req.session.returnTo;
  return saveAndRedirect(req, res, dest);
});

/* GET /auth/logout */
router.get('/logout', (req, res) => {
  if (!req.session) return res.redirect('/auth/login');
  req.session.destroy(() => res.redirect('/auth/login'));
});

export default router;
