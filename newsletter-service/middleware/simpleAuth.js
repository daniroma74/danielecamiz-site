// newsletter-service/middleware/simpleAuth.js
// Sistema di autenticazione semplice temporaneo (CLONED FROM news-admin)

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'newsletter-admin-secret-key';

// Simple session store in memory (usa Redis in produzione!)
const sessions = new Map();

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function ensureAuthenticated(req, res, next) {
  const sessionId = req.cookies?.newsletter_session;

  if (!sessionId || !sessions.has(sessionId)) {
    // Se è una richiesta JSON/AJAX
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ error: 'Non autenticato' });
    }
    // Altrimenti redirect al login
    return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }

  // Verifica che la sessione non sia scaduta (24h)
  const session = sessions.get(sessionId);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 ore

  if (now - session.createdAt > maxAge) {
    sessions.delete(sessionId);
    return res.redirect('/login?expired=1');
  }

  // Rinnova la sessione
  session.lastAccess = now;
  req.user = session.user;

  next();
}

export function handleLogin(req, res) {
  const { username, password, returnTo } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const sessionId = generateSessionId();
    const session = {
      user: { username, role: 'admin' },
      createdAt: Date.now(),
      lastAccess: Date.now()
    };

    sessions.set(sessionId, session);

    // Imposta cookie con la sessione
    res.cookie('newsletter_session', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 ore
      sameSite: 'lax'
    });

    // Redirect alla pagina richiesta (from form) o query param o default
    const redirect = returnTo || req.query.redirect || '/admin';
    return res.redirect(redirect);
  } else {
    res.status(401).json({ error: 'Credenziali non valide' });
  }
}

export function handleLogout(req, res) {
  const sessionId = req.cookies?.newsletter_session;

  if (sessionId) {
    sessions.delete(sessionId);
  }

  res.clearCookie('newsletter_session');
  res.redirect('/login');
}

// Cleanup sessioni scadute ogni ora
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastAccess > maxAge) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);
