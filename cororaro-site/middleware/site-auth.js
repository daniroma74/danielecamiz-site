/**
 * Site-wide authentication for staging
 * Protects entire site including public pages
 */

function requireSiteAuth(req, res, next) {
  // Skip auth for login page, assets, and public APIs
  const publicPaths = [
    '/login',
    '/auth/login',
    '/logout',
    '/api/', // Public APIs for site functionality
  ];

  const publicStatic = [
    '/css/',
    '/js/',
    '/assets/',
    '/shared/'
  ];

  // Check if path should skip auth
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p)) ||
      publicStatic.some(p => req.path.startsWith(p))) {
    return next();
  }

  console.log('🔐 Site auth check:', {
    path: req.path,
    sessionID: req.sessionID,
    userId: req.session?.userId,
    isAuthenticated: !!(req.session && req.session.userId)
  });

  // Check if user is authenticated
  if (req.session && req.session.userId) {
    console.log('✅ User authenticated for site:', req.session.username);
    return next();
  }

  console.log('❌ Not authenticated, redirecting to /login');

  // Redirect to site login
  res.redirect('/login');
}

module.exports = {
  requireSiteAuth
};
