/**
 * Authentication Middleware - DISABLED TEMPORARILY
 * All routes are open while we rebuild auth
 */

function requireAuth(req, res, next) {
  // TEMPORARY: Allow all requests through
  console.log('⚠️  AUTH DISABLED - Route:', req.path);
  next();
}

function redirectIfAuthenticated(req, res, next) {
  // TEMPORARY: Never redirect
  next();
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated
};
