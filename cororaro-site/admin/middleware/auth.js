/**
 * Authentication Middleware
 */

function requireAuth(req, res, next) {
  console.log('🔒 Auth check:', {
    path: req.path,
    sessionID: req.sessionID,
    userId: req.session?.userId,
    hasSession: !!req.session
  });

  if (req.session && req.session.userId) {
    console.log('✅ User authenticated:', req.session.username);
    return next();
  }

  console.log('❌ User not authenticated, redirecting to login');

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
