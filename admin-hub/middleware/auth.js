// Middleware per gestione autenticazione e autorizzazioni

const jwt = require('jsonwebtoken');
const { get, run } = require('../config/database');

// Middleware principale di autenticazione
const authMiddleware = async (req, res, next) => {
    try {
        // Verifica esistenza sessione
        if (!req.session || !req.session.userId) {
            return redirectToLogin(req, res);
        }
        
        // Verifica se la sessione è ancora valida nel database
        const session = await get(
            `SELECT * FROM user_sessions 
             WHERE id = ? AND user_id = ? AND expires_at > datetime('now')`,
            [req.session.sessionId, req.session.userId]
        );
        
        if (!session) {
            req.session.destroy();
            return redirectToLogin(req, res);
        }
        
        // Verifica 2FA se richiesto
        if (req.session.requires2FA && !req.session.verified2FA) {
            // Permetti accesso solo alla pagina 2FA
            if (!req.path.includes('/auth/two-factor')) {
                return res.redirect('/auth/two-factor');
            }
        }
        
        // Aggiorna timestamp ultima attività
        await run(
            `UPDATE user_sessions 
             SET expires_at = datetime('now', '+1 hour') 
             WHERE id = ?`,
            [req.session.sessionId]
        );
        
        // Carica dati utente aggiornati
        const user = await get(
            'SELECT id, username, email, role, permissions FROM users WHERE id = ?',
            [req.session.userId]
        );
        
        if (!user) {
            req.session.destroy();
            return redirectToLogin(req, res);
        }
        
        // Aggiungi dati utente a request e response locals
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: JSON.parse(user.permissions || '[]')
        };
        
        res.locals.user = req.user;
        res.locals.authenticated = true;
        
        // Log attività se significativa
        logUserActivity(req);
        
        next();
    } catch (error) {
        console.error('Errore middleware auth:', error);
        return res.status(500).render('errors/500', {
            title: 'Errore',
            message: 'Errore di autenticazione'
        });
    }
};

// Verifica se l'utente è già autenticato (per pagine pubbliche)
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        return res.redirect('/dashboard');
    }
    next();
};

// Verifica token JWT per API e comunicazione inter-moduli
const verifyToken = (req, res, next) => {
    // Prova a ottenere token da vari punti
    const token = req.headers['authorization']?.split(' ')[1] || 
                  req.headers['x-hub-token'] ||
                  req.query.token ||
                  req.cookies?.hubToken;
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token non fornito' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verifica che il token non sia scaduto
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token scaduto' 
            });
        }
        
        req.tokenData = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token scaduto' 
            });
        }
        return res.status(403).json({ 
            success: false, 
            message: 'Token non valido' 
        });
    }
};

// Richiede un ruolo specifico
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Non autenticato' 
            });
        }
        
        const userRole = req.user.role;
        
        // Admin ha sempre accesso
        if (userRole === 'admin') {
            return next();
        }
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).render('errors/403', {
                title: 'Accesso negato',
                message: 'Non hai i permessi per accedere a questa risorsa'
            });
        }
        
        next();
    };
};

// Richiede permessi specifici
const requirePermission = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Non autenticato' 
            });
        }
        
        const userPermissions = req.user.permissions || [];
        
        // Admin ha tutti i permessi
        if (req.user.role === 'admin' || userPermissions.includes('*')) {
            return next();
        }
        
        const hasPermission = requiredPermissions.some(permission => 
            userPermissions.includes(permission)
        );
        
        if (!hasPermission) {
            return res.status(403).render('errors/403', {
                title: 'Permesso negato',
                message: 'Non hai i permessi necessari per questa azione'
            });
        }
        
        next();
    };
};

// Genera token per comunicazione inter-moduli
const generateModuleToken = (userId, moduleId, expiresIn = '1h') => {
    const payload = {
        userId,
        moduleId,
        type: 'module_access',
        timestamp: Date.now()
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, { 
        expiresIn,
        issuer: 'admin-hub',
        audience: moduleId
    });
};

// Verifica token modulo
const verifyModuleToken = async (token, moduleId) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: 'admin-hub',
            audience: moduleId
        });
        
        // Verifica che il token sia per il modulo corretto
        if (decoded.moduleId !== moduleId) {
            return null;
        }
        
        // Verifica che il token non sia già stato usato
        const tokenRecord = await get(
            'SELECT * FROM module_tokens WHERE token = ?',
            [token]
        );
        
        if (tokenRecord && tokenRecord.used_at) {
            return null;
        }
        
        // Marca il token come usato
        if (tokenRecord) {
            await run(
                'UPDATE module_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = ?',
                [token]
            );
        }
        
        return decoded;
    } catch (error) {
        console.error('Errore verifica token modulo:', error);
        return null;
    }
};

// Helper per redirect al login
function redirectToLogin(req, res) {
    const returnUrl = encodeURIComponent(req.originalUrl);
    return res.redirect(`/auth/login?return=${returnUrl}`);
}

// Log attività utente significative
async function logUserActivity(req) {
    // Log solo azioni significative, non ogni richiesta
    const significantActions = [
        '/dashboard/settings',
        '/api/module-token',
        '/settings/security',
        '/settings/users'
    ];
    
    if (significantActions.some(action => req.path.includes(action))) {
        try {
            await run(
                `INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    req.user.id,
                    req.method + ' ' + req.path,
                    JSON.stringify({ query: req.query, body: req.body }),
                    req.ip,
                    req.get('user-agent')
                ]
            );
        } catch (error) {
            console.error('Errore log attività:', error);
        }
    }
}

// Middleware CSRF protection
const csrfProtection = (req, res, next) => {
    if (req.method === 'GET') {
        // Genera token CSRF per form
        req.session.csrfToken = require('uuid').v4();
        res.locals.csrfToken = req.session.csrfToken;
    } else if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        // Verifica token CSRF
        const token = req.body._csrf || req.headers['x-csrf-token'];
        
        if (!token || token !== req.session.csrfToken) {
            return res.status(403).json({
                success: false,
                message: 'Token CSRF non valido'
            });
        }
    }
    next();
};

module.exports = {
    authMiddleware,
    isAuthenticated,
    verifyToken,
    requireRole,
    requirePermission,
    generateModuleToken,
    verifyModuleToken,
    csrfProtection
};