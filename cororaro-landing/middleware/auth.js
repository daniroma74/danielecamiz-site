// Middleware per autenticazione admin
// Usa la stessa sessione del sito cororaro-site

export function requireAuth(req, res, next) {
  // Check if user is authenticated (same session as main site)
  if (req.session && req.session.userId) {
    return next();
  }

  // Redirect to main site login
  // In produzione usa il dominio corretto, in dev usa localhost
  const mainSiteUrl = process.env.NODE_ENV === 'production'
    ? 'https://cororaro.it'
    : 'http://localhost:3120';

  res.redirect(`${mainSiteUrl}/admin?redirect=` + encodeURIComponent(req.originalUrl));
}

export function requireAdminAuth(req, res, next) {
  // Per ora usiamo lo stesso check, in futuro possiamo aggiungere ruoli
  return requireAuth(req, res, next);
}
