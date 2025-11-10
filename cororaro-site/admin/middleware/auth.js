/**
 * Authentication Middleware
 */

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }

  // If AJAX request, return JSON error
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(401).json({
      success: false,
      message: 'Non autorizzato'
    });
  }

  // Otherwise redirect to login
  res.redirect('/admin/login');
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/admin/dashboard');
  }
  next();
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated
};
