// newsletter-service/middleware/jwtAuth.js
// JWT Authentication middleware for Admin Hub integration

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_HUB_URL = process.env.ADMIN_HUB_URL || 'http://localhost:3100';
const MODULE_ID = process.env.MODULE_ID || 'newsletter-admin';

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET not configured in .env');
  console.error('Add: JWT_SECRET=3edcbc8ecc0addb1c7b621dee02cc8e7846b63c73a4a43553267b5300b06556f');
  process.exit(1);
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token ||
                req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return handleUnauthorized(req, res, 'No authentication token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'admin-hub',
      audience: MODULE_ID
    });

    // Validate module ID matches
    if (decoded.moduleId && decoded.moduleId !== MODULE_ID) {
      return handleUnauthorized(req, res, 'Invalid module token');
    }

    // Attach user data to request
    req.user = {
      id: decoded.userId,
      moduleId: decoded.moduleId,
      timestamp: decoded.timestamp
    };

    console.log(`✅ [Newsletter Auth] User ${req.user.id} authenticated`);
    next();

  } catch (error) {
    console.error(`❌ [Newsletter Auth] Token verification failed:`, error.message);
    return handleUnauthorized(req, res, 'Token verification failed');
  }
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.auth_token;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.userId,
        moduleId: decoded.moduleId
      };
    } catch (error) {
      req.user = null;
    }
  }

  next();
}

function handleUnauthorized(req, res, reason) {
  console.warn(`⚠️  [Newsletter Auth] Unauthorized access: ${reason}`);

  // API requests get JSON response
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({
      error: 'Authentication required',
      redirectUrl: `${ADMIN_HUB_URL}/auth/login`
    });
  }

  // Browser requests redirect to Admin Hub login
  const returnUrl = encodeURIComponent(req.originalUrl);
  return res.redirect(`${ADMIN_HUB_URL}/auth/login?redirect=${returnUrl}`);
}

export default { requireAuth, optionalAuth };
