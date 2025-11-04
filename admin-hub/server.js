// Admin HUB Server - Portale centrale per tutti i moduli amministrativi
// Gestisce autenticazione, 2FA, sessioni condivise e accesso ai moduli

const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
require('dotenv').config();

// Verifica configurazione essenziale
if (!process.env.SESSION_SECRET || !process.env.JWT_SECRET) {
    console.error('ERRORE: Configura SESSION_SECRET e JWT_SECRET nel file .env');
    process.exit(1);
}

// Configurazione logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: path.join(__dirname, 'logs', 'error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: path.join(__dirname, 'logs', 'combined.log') 
        })
    ]
});

// In sviluppo, log anche su console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Importa middleware personalizzati
const { setupSecurity } = require('./middleware/security');
const { authMiddleware, isAuthenticated } = require('./middleware/auth');
const { createRateLimiter } = require('./middleware/rateLimits');

// Importa routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const apiRoutes = require('./routes/apiRoutes');
const settingsRoutes = require('./routes/settingRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Inizializza Express
const app = express();
const PORT = process.env.PORT || 3100;

// Trust proxy per nginx (importante per rate limiting e CORS)
app.set('trust proxy', 1);

// Crea directory logs se non esiste
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Setup sicurezza base con Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configurato per sottodomini e stesso dominio
const corsOptions = {
    origin: function (origin, callback) {
        // Domini permessi
        const allowedDomains = [
            `https://${process.env.HUB_DOMAIN}`,
            `http://${process.env.HUB_DOMAIN}`,
            `https://events-admin.${process.env.MAIN_DOMAIN}`,
            `https://newsletter-admin.${process.env.MAIN_DOMAIN}`,
            `https://concerts-admin.${process.env.MAIN_DOMAIN}`,
            `https://bio-admin.${process.env.MAIN_DOMAIN}`,
            `https://press-admin.${process.env.MAIN_DOMAIN}`,
            `https://gallery-admin.${process.env.MAIN_DOMAIN}`,
            'http://localhost:3100',
            'http://localhost:3005'
        ];

        // Permetti richieste senza origin (direct browser access)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedDomains.indexOf(origin) !== -1 || allowedDomains.includes(origin)) {
            callback(null, true);
        } else {
            // In produzione, permetti comunque same-origin
            console.log(`[CORS] Origin non in lista: ${origin}`);
            callback(null, true); // Temporaneamente permetti tutto per debug
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Hub-Token', 'X-CSRF-Token']
};

app.use(cors(corsOptions));

// Middleware generali
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Logging HTTP
const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs', 'access.log'), 
    { flags: 'a' }
);

app.use(morgan('combined', { stream: accessLogStream }));

// In sviluppo, log anche su console
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Configurazione sessioni sicure con SQLite
const sessionConfig = {
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './database',
        table: 'sessions',
        concurrentDB: true
    }),
    name: process.env.SESSION_NAME || 'hub_session',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_TIMEOUT) || 3600000,
        sameSite: 'strict'
    }
};

app.use(session(sessionConfig));

// Impostazioni view engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servire file statici
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// Variabili globali per views
app.use((req, res, next) => {
    res.locals.appName = 'Admin HUB';
    res.locals.year = new Date().getFullYear();
    res.locals.user = req.session.user || null;
    res.locals.csrfToken = req.session.csrfToken || null;
    next();
});

// Controllo modalità manutenzione
app.use((req, res, next) => {
    if (process.env.MAINTENANCE_MODE === 'true' && !req.path.startsWith('/public')) {
        return res.status(503).render('errors/maintenance', {
            message: process.env.MAINTENANCE_MESSAGE
        });
    }
    next();
});

// Rate limiting
const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: process.env.RATE_LIMIT_LOGIN_MAX || 5,
    message: 'Troppi tentativi di login, riprova tra 15 minuti'
});

const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100
});

// Routes pubbliche (autenticazione)
app.use('/auth', loginLimiter, authRoutes);

// Pagina principale - redirect basato su stato auth
app.get('/', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

// Routes protette (richiedono autenticazione)
app.use('/dashboard', authMiddleware, dashboardRoutes);
app.use('/api', authMiddleware, apiLimiter, apiRoutes);
app.use('/settings', authMiddleware, settingsRoutes);
app.use('/api/analytics', analyticsRoutes); // Mix: /track pubblico, query protette

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Gestione errore 404
app.use((req, res) => {
    logger.warn(`404 - Pagina non trovata: ${req.originalUrl}`);
    res.status(404).render('errors/404', {
        title: 'Pagina non trovata',
        path: req.originalUrl
    });
});

// Gestione errori generali
app.use((err, req, res, next) => {
    logger.error('Errore server:', err);
    
    // Non esporre dettagli errore in produzione
    const message = process.env.NODE_ENV === 'production' 
        ? 'Si è verificato un errore interno' 
        : err.message;
    
    res.status(err.status || 500).render('errors/500', {
        title: 'Errore Server',
        message: message,
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Avvio server
const server = app.listen(PORT, () => {
    logger.info(`Admin HUB avviato su porta ${PORT}`);
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║           ADMIN HUB - AVVIATO                ║
    ╠══════════════════════════════════════════════╣
    ║  URL:        http://localhost:${PORT}          ║
    ║  Ambiente:   ${process.env.NODE_ENV || 'development'}              ║
    ║  Database:   ${process.env.DB_PATH}            ║
    ║  Log Level:  ${process.env.LOG_LEVEL || 'info'}                    ║
    ╚══════════════════════════════════════════════╝
    
    Moduli registrati:
    ✓ Events Admin     - events-admin.${process.env.MAIN_DOMAIN}
    ✓ Newsletter Admin - newsletter-admin.${process.env.MAIN_DOMAIN}
    ✓ Concerts Admin   - concerts-admin.${process.env.MAIN_DOMAIN}
    
    Per creare l'utente admin iniziale:
    npm run create-admin
    `);
});

// Gestione chiusura pulita
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
    logger.info('Ricevuto segnale di terminazione, chiusura in corso...');
    
    server.close(() => {
        logger.info('Server HTTP chiuso');
        
        // Chiudi connessioni database
        const db = require('./config/database');
        if (db) {
            db.close(() => {
                logger.info('Connessioni database chiuse');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
    
    // Forza chiusura dopo 10 secondi
    setTimeout(() => {
        logger.error('Chiusura forzata dopo timeout');
        process.exit(1);
    }, 10000);
}

// Gestione errori non catturati
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;