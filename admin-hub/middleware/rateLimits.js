// Middleware per rate limiting e protezione brute force

const rateLimit = require('express-rate-limit');

// Rate limiter per login (più restrittivo)
const loginLimiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minuti default
    max: process.env.RATE_LIMIT_LOGIN_MAX || 5, // 5 tentativi
    message: 'Troppi tentativi di login. Riprova tra 15 minuti.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).render('auth/login', {
            title: 'Login - Admin HUB',
            error: 'Troppi tentativi di login. Account temporaneamente bloccato per sicurezza. Riprova tra 15 minuti.',
            returnUrl: req.query.return || '/dashboard',
            csrfToken: req.session?.csrfToken || ''
        });
    },
    skip: (req) => {
        // Salta rate limiting in sviluppo se configurato
        return process.env.NODE_ENV === 'development' && process.env.DEV_DISABLE_RATE_LIMIT === 'true';
    }
});

// Rate limiter standard per API
const apiLimiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
    message: {
        success: false,
        message: 'Troppe richieste. Riprova più tardi.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && process.env.DEV_DISABLE_RATE_LIMIT === 'true';
    }
});

// Rate limiter per richieste generali
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // 60 richieste al minuto
    message: 'Troppe richieste dal tuo IP. Rallenta un po\'.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Salta per risorse statiche
        return req.path.startsWith('/public') || 
               req.path.endsWith('.css') || 
               req.path.endsWith('.js') ||
               req.path.endsWith('.jpg') ||
               req.path.endsWith('.png');
    }
});

// Factory per creare rate limiter personalizzati
const createRateLimiter = (options = {}) => {
    const defaults = {
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false
    };
    
    return rateLimit({ ...defaults, ...options });
};

module.exports = {
    loginLimiter,
    apiLimiter,
    generalLimiter,
    createRateLimiter
};