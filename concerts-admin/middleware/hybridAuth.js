// concerts-admin/middleware/hybridAuth.js
// Hybrid authentication: JWT token from Hub OR local session

import jwt from 'jsonwebtoken';

const MODULE_ID = 'concerts-admin';
const sessions = new Map();

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function ensureAuthenticated(req, res, next) {
  // Read credentials at runtime to ensure dotenv has been loaded
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';
  const JWT_SECRET = process.env.JWT_SECRET;

  // Try 1: JWT token from Admin Hub (cookie auth_token)
  const hubToken = req.cookies?.auth_token;

  if (hubToken && JWT_SECRET) {
    try {
      console.log(`🔍 [Concerts] Verifying JWT with issuer: admin-hub, audience: ${MODULE_ID}`);
      const decoded = jwt.verify(hubToken, JWT_SECRET, {
        issuer: 'admin-hub',
        audience: MODULE_ID
      });

      // Valid JWT from hub
      req.user = {
        id: decoded.userId,
        username: 'hub-admin',
        role: 'admin',
        source: 'hub'
      };
      console.log(`✅ [Concerts] Authenticated via Hub token (user ${decoded.userId})`);
      return next();
    } catch (error) {
      console.error(`❌ [Concerts] Hub token verification failed:`, error.message);
      console.error(`   Token value: ${hubToken.substring(0, 20)}...`);
      // Continue to local session check
    }
  } else {
    console.log(`⚠️  [Concerts] No hub token or JWT_SECRET missing`);
  }

  // Try 2: Local session (cookie concerts_session)
  const sessionId = req.cookies?.concerts_session;

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24h

    if (now - session.createdAt < maxAge) {
      session.lastAccess = now;
      req.user = { ...session.user, source: 'local' };
      return next();
    } else {
      sessions.delete(sessionId);
    }
  }

  // No valid authentication found
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  return res.redirect(`/auth/login?redirect=${encodeURIComponent(req.originalUrl)}`);
}

export function handleLogin(req, res) {
  const { username, password, returnTo } = req.body;
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const sessionId = generateSessionId();
    const session = {
      user: { username, role: 'admin' },
      createdAt: Date.now(),
      lastAccess: Date.now()
    };

    sessions.set(sessionId, session);

    res.cookie('concerts_session', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    const redirect = returnTo || req.query.redirect || '/admin';
    return res.redirect(redirect);
  } else {
    res.status(401).json({ error: 'Credenziali non valide' });
  }
}

export function handleLogout(req, res) {
  const sessionId = req.cookies?.concerts_session;

  if (sessionId) {
    sessions.delete(sessionId);
  }

  res.clearCookie('concerts_session');
  res.clearCookie('auth_token'); // Clear hub token too
  res.redirect('/login');
}

// Cleanup expired sessions every hour
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastAccess > maxAge) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);
