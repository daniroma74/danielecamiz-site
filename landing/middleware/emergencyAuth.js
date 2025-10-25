// landing/middleware/emergencyAuth.js
// TEMPORARY EMERGENCY PROTECTION - Replace with JWT ASAP!

export function emergencyAuth(req, res, next) {
  // Only protect admin routes (events-admin.danielecamiz.com)
  if (!req.isEventAdmin) {
    return next(); // Public landing pages remain accessible
  }

  const TEMP_USER = process.env.TEMP_ADMIN_USER || 'admin';
  const TEMP_PASS = process.env.TEMP_ADMIN_PASS || 'TempSecure2025!';

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Events Admin - Temporary Protection"');
    return res.status(401).send('Authentication required');
  }

  const base64 = authHeader.split(' ')[1];
  const [username, password] = Buffer.from(base64, 'base64').toString().split(':');

  if (username === TEMP_USER && password === TEMP_PASS) {
    console.log(`✅ Emergency auth success for: ${username}`);
    return next();
  }

  console.warn(`❌ Emergency auth failed for: ${username}`);
  res.setHeader('WWW-Authenticate', 'Basic realm="Events Admin - Temporary Protection"');
  return res.status(401).send('Invalid credentials');
}
