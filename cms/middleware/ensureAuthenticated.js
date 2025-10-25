// cms/middleware/ensureAuthenticated.js
// Robusto su login + 2FA, nessuna dipendenza esterna.

function isTwoFAVerified(req) {
  const u = (req.session && req.session.user) || req.user || {};
  const flags = [
    u.is2faVerified, u.isTwoFAVerified, u.twoFA, u.tfa, u.two_factor, u.two_factor_verified,
    req.session?.is2faVerified, req.session?.isTwoFAVerified,
    req.session?.twoFA, req.session?.tfa, req.session?.two_factor_verified
  ];
  return flags.some(v => v === true);
}

function isLoggedIn(req) {
  return !!(
    req.session?.user ||
    req.user ||
    req.session?.loggedIn === true ||
    req.session?.isAuthenticated === true
  );
}

export function ensureAuthenticated(req, res, next) {
  try {
    const require2FA = process.env.REQUIRE_2FA === '1';
    const disable2FA = process.env.ADMIN_DISABLE_2FA === '1';

    if (isLoggedIn(req)) {
      if (disable2FA || !require2FA || isTwoFAVerified(req)) {
        return next();
      }
    }

    // Ricorda la destinazione per il post-login
    const loginPath = process.env.ADMIN_LOGIN_PATH || '/auth/login'; // fallback: /auth/login
    if (req.originalUrl && !req.originalUrl.startsWith(loginPath)) {
      if (req.session) req.session.returnTo = req.originalUrl;
    }
    return res.redirect(loginPath);
  } catch (err) {
    console.error('[ensureAuthenticated] error:', err);
    return res.redirect(process.env.ADMIN_LOGIN_PATH || '/auth/login');
  }
}