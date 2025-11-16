// orchestraicnt-site/admin/middleware/auth.js
// Middleware di autenticazione per proteggere le routes admin

/**
 * Middleware per verificare se l'utente è autenticato
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    // Utente autenticato, continua
    return next();
  }

  // Non autenticato, redirect a login
  res.redirect('/admin/login');
}

/**
 * Middleware per redirect se già autenticato
 * (evita di mostrare login se già loggato)
 */
function redirectIfAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    // Già autenticato, vai a settings
    return res.redirect('/admin/settings');
  }

  // Non autenticato, mostra login
  next();
}

module.exports = {
  requireAuth,
  redirectIfAuth
};
