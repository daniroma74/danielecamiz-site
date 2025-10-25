// Middleware per sicurezza e headers

const helmet = require('helmet');
const crypto = require('crypto');

// Setup sicurezza base
const setupSecurity = (app) => {
    // Helmet per headers sicurezza
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                fontSrc: ["'self'", "fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));
    
    // Headers personalizzati
    app.use((req, res, next) => {
        // Remove fingerprinting headers
        res.removeHeader('X-Powered-By');
        
        // Custom security headers
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        
        next();
    });
    
    // Genera nonce per CSP inline scripts
    app.use((req, res, next) => {
        res.locals.nonce = crypto.randomBytes(16).toString('base64');
        next();
    });
};

// Middleware per validazione input
const sanitizeInput = (req, res, next) => {
    // Sanitizza parametri query
    if (req.query) {
        for (let key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].trim();
            }
        }
    }
    
    // Sanitizza body
    if (req.body) {
        sanitizeObject(req.body);
    }
    
    next();
};

// Funzione ricorsiva per sanitizzare oggetti
function sanitizeObject(obj) {
    for (let key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = obj[key].trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
}

// Middleware per prevenire clickjacking
const preventClickjacking = (req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    next();
};

// Middleware per validare Content-Type
const validateContentType = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        const contentType = req.headers['content-type'];
        
        if (!contentType || (!contentType.includes('application/json') && 
            !contentType.includes('application/x-www-form-urlencoded') &&
            !contentType.includes('multipart/form-data'))) {
            return res.status(400).json({
                success: false,
                message: 'Content-Type non valido'
            });
        }
    }
    next();
};

module.exports = {
    setupSecurity,
    sanitizeInput,
    preventClickjacking,
    validateContentType
};