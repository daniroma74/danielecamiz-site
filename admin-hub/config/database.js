// Configurazione database - USA main.sqlite ESISTENTE del progetto principale

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

// Logger per database
const logger = winston.createLogger({
    level: process.env.DB_LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [DB-${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ 
            filename: path.join(__dirname, '..', 'logs', 'database.log') 
        })
    ]
});

// USA IL DATABASE PRINCIPALE ESISTENTE
// Il database si trova in cms/db/main.sqlite
let dbPath = path.resolve(__dirname, '../../cms/db/main.sqlite');
const dbDir = path.dirname(dbPath);

// Verifica che il database principale esista
if (!fs.existsSync(dbPath)) {
    // Prova percorso da variabile ambiente
    if (process.env.DB_PATH) {
        dbPath = path.resolve(__dirname, '..', process.env.DB_PATH);
        if (!fs.existsSync(dbPath)) {
            logger.error(`Database non trovato nel percorso specificato: ${dbPath}`);
            console.error('ERRORE: Il database principale main.sqlite non esiste!');
            console.error(`Percorso configurato: ${process.env.DB_PATH}`);
            console.error('Verifica il percorso in .env');
            process.exit(1);
        }
    } else {
        logger.error(`Database principale non trovato in: ${dbPath}`);
        console.error('ERRORE: Il database principale main.sqlite non esiste!');
        console.error('Il database dovrebbe trovarsi in: cms/db/main.sqlite');
        console.error('Configura il percorso corretto in DB_PATH nel file .env');
        process.exit(1);
    }
}

// Inizializza connessione database
let db;

try {
    db = new Database(dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? logger.debug : null
    });
    
    logger.info(`Connesso al database principale: ${dbPath}`);
    
    // Abilita foreign keys
    db.pragma('foreign_keys = ON');
    
    // Ottimizzazioni performance
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000');
    db.pragma('temp_store = MEMORY');
    
} catch (error) {
    logger.error(`Errore connessione database: ${error.message}`);
    process.exit(1);
}

// Aggiungi tabelle specifiche per Admin HUB al database esistente
function initializeHubTables() {
    try {
        // Tabella sessioni Admin HUB
        db.exec(`
            CREATE TABLE IF NOT EXISTS hub_sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Tabella utenti Admin HUB (estende tabella users esistente)
        db.exec(`
            CREATE TABLE IF NOT EXISTS hub_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'editor',
                permissions TEXT DEFAULT '[]',
                two_factor_enabled INTEGER DEFAULT 0,
                two_factor_secret TEXT,
                active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                login_attempts INTEGER DEFAULT 0,
                locked_until DATETIME
            )
        `);
        
        // Tabella log attività HUB
        db.exec(`
            CREATE TABLE IF NOT EXISTS hub_activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                module_id TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES hub_users(id) ON DELETE SET NULL
            )
        `);
        
        // Tabella moduli registrati
        db.exec(`
            CREATE TABLE IF NOT EXISTS hub_modules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                url TEXT NOT NULL,
                subdomain TEXT NOT NULL,
                icon TEXT,
                color TEXT,
                status TEXT DEFAULT 'active',
                order_index INTEGER DEFAULT 0,
                permissions TEXT DEFAULT '["admin"]',
                features TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Tabella token moduli
        db.exec(`
            CREATE TABLE IF NOT EXISTS hub_module_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                module_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                used_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES hub_users(id) ON DELETE CASCADE,
                FOREIGN KEY (module_id) REFERENCES hub_modules(id) ON DELETE CASCADE
            )
        `);
        
        // Tabella impostazioni HUB
        db.exec(`
            CREATE TABLE IF NOT EXISTS hub_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                type TEXT DEFAULT 'string',
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Tabella tentativi login
        db.exec(`
            CREATE TABLE IF NOT EXISTS hub_login_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                ip_address TEXT,
                success INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Crea indici per performance
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_hub_sessions_user ON hub_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_hub_sessions_expires ON hub_sessions(expires_at);
            CREATE INDEX IF NOT EXISTS idx_hub_activity_user ON hub_activity_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_hub_activity_created ON hub_activity_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_hub_tokens_user ON hub_module_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_hub_tokens_module ON hub_module_tokens(module_id);
        `);
        
        logger.info('Tabelle Admin HUB inizializzate nel database principale');
        
        // Inserisci moduli predefiniti
        insertDefaultModules();
        
        // Inserisci impostazioni predefinite
        insertDefaultSettings();
        
    } catch (error) {
        logger.error(`Errore inizializzazione tabelle HUB: ${error.message}`);
        throw error;
    }
}

// Inserisci moduli predefiniti
function insertDefaultModules() {
    const modules = [
        {
            id: 'events-admin',
            name: 'Landing Pages',
            description: 'Gestione Landing Pages eventi',
            url: `https://events-admin.${process.env.MAIN_DOMAIN || 'danielecamiz.com'}`,
            subdomain: 'events-admin',
            icon: '📅',
            color: '#4A90E2',
            status: 'active',
            order_index: 1,
            permissions: JSON.stringify(['admin', 'editor']),
            features: JSON.stringify([
                'Creazione landing pages',
                'Gestione eventi',
                'Statistiche visite'
            ])
        },
        {
            id: 'newsletter-admin',
            name: 'Newsletter',
            description: 'Gestione newsletter e mailing list',
            url: `https://newsletter-admin.${process.env.MAIN_DOMAIN || 'danielecamiz.com'}`,
            subdomain: 'newsletter-admin',
            icon: '📧',
            color: '#27AE60',
            status: 'active',
            order_index: 2,
            permissions: JSON.stringify(['admin', 'editor']),
            features: JSON.stringify([
                'Invio newsletter',
                'Gestione iscritti',
                'Template email',
                'Statistiche invii'
            ])
        },
        {
            id: 'concerts-admin',
            name: 'Concerti',
            description: 'Gestione concerti e archivio',
            url: `https://concerts-admin.${process.env.MAIN_DOMAIN || 'danielecamiz.com'}`,
            subdomain: 'concerts-admin',
            icon: '🎵',
            color: '#E74C3C',
            status: 'active',
            order_index: 3,
            permissions: JSON.stringify(['admin']),
            features: JSON.stringify([
                'Calendario concerti',
                'Archivio storico',
                'Gestione poster',
                'Repertorio'
            ])
        },
        {
            id: 'news-admin',
            name: 'News & Social',
            description: 'Gestione news e pubblicazioni social media',
            url: `https://news-admin.${process.env.MAIN_DOMAIN || 'danielecamiz.com'}`,
            subdomain: 'news-admin',
            icon: '📰',
            color: '#10B981',
            status: 'active',
            order_index: 4,
            permissions: JSON.stringify(['admin', 'editor']),
            features: JSON.stringify([
                'Gestione articoli news',
                'Pubblicazione social media',
                'Integrazione Cloudinary',
                'Auto-posting Facebook/LinkedIn/Threads'
            ])
        }
    ];
    
    const insertModule = db.prepare(`
        INSERT OR IGNORE INTO hub_modules 
        (id, name, description, url, subdomain, icon, color, status, order_index, permissions, features)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const module of modules) {
        insertModule.run(
            module.id,
            module.name,
            module.description,
            module.url,
            module.subdomain,
            module.icon,
            module.color,
            module.status,
            module.order_index,
            module.permissions,
            module.features
        );
    }
    
    logger.info('Moduli predefiniti inseriti');
}

// Inserisci impostazioni predefinite
function insertDefaultSettings() {
    const settings = [
        {
            key: 'session_timeout',
            value: '3600000',
            type: 'number',
            description: 'Timeout sessione in millisecondi'
        },
        {
            key: 'max_login_attempts',
            value: '5',
            type: 'number',
            description: 'Massimo numero di tentativi login'
        },
        {
            key: 'lockout_duration',
            value: '900000',
            type: 'number',
            description: 'Durata blocco dopo tentativi falliti (ms)'
        },
        {
            key: 'require_2fa',
            value: 'false',
            type: 'boolean',
            description: 'Richiedi 2FA per tutti gli utenti'
        }
    ];
    
    const insertSetting = db.prepare(`
        INSERT OR IGNORE INTO hub_settings (key, value, type, description)
        VALUES (?, ?, ?, ?)
    `);
    
    for (const setting of settings) {
        insertSetting.run(setting.key, setting.value, setting.type, setting.description);
    }
    
    logger.info('Impostazioni predefinite inserite');
}

// Funzioni database utility
const dbUtils = {
    all: (sql, params = []) => {
        try {
            return db.prepare(sql).all(params);
        } catch (error) {
            logger.error(`Errore query all: ${error.message}`);
            throw error;
        }
    },
    
    get: (sql, params = []) => {
        try {
            return db.prepare(sql).get(params);
        } catch (error) {
            logger.error(`Errore query get: ${error.message}`);
            throw error;
        }
    },
    
    run: (sql, params = []) => {
        try {
            return db.prepare(sql).run(params);
        } catch (error) {
            logger.error(`Errore query run: ${error.message}`);
            throw error;
        }
    },
    
    close: () => {
        try {
            db.close();
            logger.info('Database chiuso');
        } catch (error) {
            logger.error(`Errore chiusura database: ${error.message}`);
        }
    }
};

// Inizializza tabelle HUB all'avvio
initializeHubTables();

// Esporta database e utility
module.exports = {
    db,
    ...dbUtils,
    logger
};