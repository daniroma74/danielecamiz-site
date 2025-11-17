// Middleware per autenticazione admin
// Usa la stessa sessione del sito cororaro-site

export function requireAuth(req, res, next) {
  // Check if user is authenticated (same session as main site)
  if (req.session && req.session.userId) {
    return next();
  }

  // Redirect to main site login
  res.redirect('http://localhost:3120/admin/login?redirect=' + encodeURIComponent(req.originalUrl));
}

export function requireAdminAuth(req, res, next) {
  // Per ora usiamo lo stesso check, in futuro possiamo aggiungere ruoli
  return requireAuth(req, res, next);
}
