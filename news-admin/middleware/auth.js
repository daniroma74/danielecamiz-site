// news-admin/middleware/auth.js
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export function ensureAuthenticated(req, res, next) {
  // Controlla il token JWT nel cookie o header
  const token = req.cookies?.auth_token || 
                req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ error: 'Non autenticato' });
    }
    return res.redirect(`${config.adminHubUrl}/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('[NEWS-ADMIN Auth Error]:', error.message);
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ error: 'Token non valido' });
    }
    
    return res.redirect(`${config.adminHubUrl}/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.auth_token || 
                req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
    } catch (error) {
      req.user = null;
    }
  }
  
  next();
}

export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      role: user.role || 'admin'
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiry }
  );
}