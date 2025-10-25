// Middleware per configurazione e gestione sessioni

const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');

// Configurazione store SQLite per sessioni
const sessionStore = new SQLiteStore({
    db: 'hub_sessions.db',
    dir: path.join(__dirname, '../database'),
    table: 'sessions',
    concurrentDB: true
});

// Configurazione sessioni
const sessionConfig = {
    store: sessionStore,
    name: process.env.SESSION_NAME || 'hub_session',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Rinnova cookie ad ogni richiesta
    cookie: {
        secure: process.env.NODE_ENV === 'production' && process.env.SESSION_SECURE === 'true',
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_TIMEOUT) || 3600000, // 1 ora default
        sameSite: process.env.SESSION_SAME_SITE || 'strict'
    }
};

// Middleware per refresh sessione
const refreshSession = (req, res, next) => {
    if (req.session && req.session.userId) {
        req.session.lastActivity = Date.now();
    }
    next();
};

// Middleware per controllo scadenza sessione
const checkSessionExpiry = (req, res, next) => {
    if (req.session && req.session.userId) {
        const now = Date.now();
        const lastActivity = req.session.lastActivity || req.session.cookie._expires;
        const maxAge = req.session.cookie.maxAge;
        
        if (now - lastActivity > maxAge) {
            req.session.destroy((err) => {
                if (err) console.error('Errore distruzione sessione:', err);
                return res.redirect('/auth/login?expired=true');
            });
        } else {
            next();
        }
    } else {
        next();
    }
};

module.exports = {
    sessionConfig,
    refreshSession,
    checkSessionExpiry
};