const ADMIN_USERNAME = process.env.PRESS_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.PRESS_ADMIN_PASS || 'changeme123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'press-admin-secret-key';

const sessions = new Map();

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function ensureAuthenticated(req, res, next) {
  const sessionId = req.cookies?.press_session;

  if (!sessionId || !sessions.has(sessionId)) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ error: 'Non autenticato' });
    }
    return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }

  const session = sessions.get(sessionId);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  if (now - session.createdAt > maxAge) {
    sessions.delete(sessionId);
    return res.redirect('/login?expired=1');
  }

  session.lastAccess = now;
  req.user = session.user;

  next();
}

export function handleLogin(req, res) {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const sessionId = generateSessionId();
    const session = {
      user: { username, role: 'admin' },
      createdAt: Date.now(),
      lastAccess: Date.now()
    };

    sessions.set(sessionId, session);

    res.cookie('press_session', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    const redirect = req.query.redirect || '/press';
    res.json({ success: true, redirect });
  } else {
    res.status(401).json({ error: 'Credenziali non valide' });
  }
}

export function handleLogout(req, res) {
  const sessionId = req.cookies?.press_session;

  if (sessionId) {
    sessions.delete(sessionId);
  }

  res.clearCookie('press_session');
  res.redirect('/login');
}

setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastAccess > maxAge) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);
