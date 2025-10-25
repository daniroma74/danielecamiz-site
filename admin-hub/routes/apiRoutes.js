// API routes per comunicazione inter-moduli e servizi

const express = require('express');
const router = express.Router();
const { generateModuleToken, verifyModuleToken } = require('../middleware/auth');
const { get, run, all } = require('../config/database');

// Genera token per accesso modulo (con cookie cross-subdomain)
router.post('/generate-module-token/:moduleId', async (req, res) => {
    try {
        const { moduleId } = req.params;

        if (!moduleId) {
            return res.status(400).json({
                success: false,
                message: 'Module ID richiesto'
            });
        }

        // Verifica che il modulo esista e sia attivo
        const module = await get(
            'SELECT * FROM hub_modules WHERE id = ? AND status = ?',
            [moduleId, 'active']
        );

        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Modulo non trovato o non attivo'
            });
        }

        // Verifica permessi utente per il modulo
        const modulePermissions = JSON.parse(module.permissions || '[]');
        const hasAccess = req.user.role === 'admin' ||
            modulePermissions.some(p => req.user.permissions.includes(p));

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Accesso al modulo negato'
            });
        }

        // Genera token JWT
        const token = generateModuleToken(req.user.id, moduleId);

        // Salva token nel database per tracking
        await run(
            `INSERT INTO hub_module_tokens (token, user_id, module_id, expires_at)
             VALUES (?, ?, ?, datetime('now', '+1 hour'))`,
            [token, req.user.id, moduleId]
        );

        // Log accesso
        await run(
            `INSERT INTO hub_activity_logs (user_id, action, details, module_id)
             VALUES (?, ?, ?, ?)`,
            [
                req.user.id,
                'module_access_token_generated',
                JSON.stringify({ moduleId, timestamp: Date.now() }),
                moduleId
            ]
        );

        // 🔐 SET COOKIE FOR CROSS-SUBDOMAIN ACCESS
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: `.${process.env.MAIN_DOMAIN || 'danielecamiz.com'}`, // Shared across subdomains!
            maxAge: 3600000 // 1 hour
        });

        res.json({
            success: true,
            token,
            moduleUrl: module.url,
            expiresIn: 3600
        });

    } catch (error) {
        console.error('Errore generazione token modulo:', error);
        res.status(500).json({
            success: false,
            message: 'Errore generazione token'
        });
    }
});

// Genera token per accesso modulo (backward compatibility)
router.post('/module-token', async (req, res) => {
    try {
        const { moduleId } = req.body;
        
        if (!moduleId) {
            return res.status(400).json({
                success: false,
                message: 'Module ID richiesto'
            });
        }
        
        // Verifica che il modulo esista e sia attivo
        const module = await get(
            'SELECT * FROM modules WHERE id = ? AND status = ?',
            [moduleId, 'active']
        );
        
        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Modulo non trovato o non attivo'
            });
        }
        
        // Verifica permessi utente per il modulo
        const modulePermissions = JSON.parse(module.permissions || '[]');
        const hasAccess = req.user.role === 'admin' || 
            modulePermissions.some(p => req.user.permissions.includes(p));
        
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Accesso al modulo negato'
            });
        }
        
        // Genera token JWT
        const token = generateModuleToken(req.user.id, moduleId);
        
        // Salva token nel database per tracking
        await run(
            `INSERT INTO module_tokens (token, user_id, module_id, expires_at)
             VALUES (?, ?, ?, datetime('now', '+1 hour'))`,
            [token, req.user.id, moduleId]
        );
        
        // Log accesso
        await run(
            `INSERT INTO activity_logs (user_id, action, details)
             VALUES (?, ?, ?)`,
            [
                req.user.id,
                'module_access',
                JSON.stringify({ moduleId, timestamp: Date.now() })
            ]
        );
        
        res.json({
            success: true,
            token,
            expiresIn: 3600 // 1 ora
        });
        
    } catch (error) {
        console.error('Errore generazione token:', error);
        res.status(500).json({
            success: false,
            message: 'Errore generazione token'
        });
    }
});

// Verifica validità token modulo
router.post('/verify-token', async (req, res) => {
    try {
        const { token, moduleId } = req.body;
        
        if (!token || !moduleId) {
            return res.status(400).json({
                success: false,
                message: 'Token e Module ID richiesti'
            });
        }
        
        const decoded = await verifyModuleToken(token, moduleId);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Token non valido o scaduto'
            });
        }
        
        // Recupera info utente
        const user = await get(
            'SELECT id, username, email, role, permissions FROM users WHERE id = ?',
            [decoded.userId]
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: JSON.parse(user.permissions || '[]')
            },
            moduleId: decoded.moduleId,
            issuedAt: decoded.timestamp
        });
        
    } catch (error) {
        console.error('Errore verifica token:', error);
        res.status(500).json({
            success: false,
            message: 'Errore verifica token'
        });
    }
});

// Controlla stato sessione
router.get('/session/check', async (req, res) => {
    try {
        const session = await get(
            `SELECT * FROM user_sessions 
             WHERE id = ? AND expires_at > datetime('now')`,
            [req.session.sessionId]
        );
        
        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Sessione scaduta'
            });
        }
        
        const expiresAt = new Date(session.expires_at);
        const remainingTime = expiresAt - new Date();
        
        res.json({
            success: true,
            remainingTime,
            expiresAt: expiresAt.toISOString()
        });
        
    } catch (error) {
        console.error('Errore controllo sessione:', error);
        res.status(500).json({
            success: false,
            message: 'Errore controllo sessione'
        });
    }
});

// Estendi sessione
router.post('/session/extend', async (req, res) => {
    try {
        const newExpiry = new Date(Date.now() + 60 * 60 * 1000); // +1 ora
        
        const result = await run(
            'UPDATE user_sessions SET expires_at = ? WHERE id = ?',
            [newExpiry.toISOString(), req.session.sessionId]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sessione non trovata'
            });
        }
        
        res.json({
            success: true,
            newExpiry: newExpiry.toISOString()
        });
        
    } catch (error) {
        console.error('Errore estensione sessione:', error);
        res.status(500).json({
            success: false,
            message: 'Errore estensione sessione'
        });
    }
});

// Ottieni attività recenti
router.get('/activities/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const activities = await all(
            `SELECT a.*, u.username 
             FROM activity_logs a
             LEFT JOIN users u ON a.user_id = u.id
             ORDER BY a.created_at DESC
             LIMIT ?`,
            [limit]
        );
        
        res.json(activities.map(activity => ({
            id: activity.id,
            action: activity.action,
            username: activity.username,
            details: JSON.parse(activity.details || '{}'),
            timestamp: activity.created_at
        })));
        
    } catch (error) {
        console.error('Errore caricamento attività:', error);
        res.status(500).json([]);
    }
});

// Ottieni notifiche utente
router.get('/notifications', async (req, res) => {
    try {
        const notifications = await all(
            `SELECT * FROM notifications 
             WHERE user_id = ? AND read = 0 
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        
        res.json(notifications.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            createdAt: n.created_at
        })));
        
    } catch (error) {
        console.error('Errore caricamento notifiche:', error);
        res.status(500).json([]);
    }
});

// Segna notifica come letta
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await run(
            `UPDATE notifications 
             SET read = 1, read_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notifica non trovata'
            });
        }
        
        res.json({
            success: true,
            message: 'Notifica segnata come letta'
        });
        
    } catch (error) {
        console.error('Errore aggiornamento notifica:', error);
        res.status(500).json({
            success: false,
            message: 'Errore aggiornamento notifica'
        });
    }
});

// Info sistema
router.get('/system/info', async (req, res) => {
    try {
        // Solo admin può vedere info sistema
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato'
            });
        }
        
        const totalUsers = await get('SELECT COUNT(*) as count FROM users');
        const activeSessions = await get(
            `SELECT COUNT(*) as count FROM user_sessions 
             WHERE expires_at > datetime('now')`
        );
        const totalModules = await get('SELECT COUNT(*) as count FROM modules');
        const activeModules = await get(
            "SELECT COUNT(*) as count FROM modules WHERE status = 'active'"
        );
        
        res.json({
            success: true,
            system: {
                version: '1.0.0',
                nodeVersion: process.version,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            },
            stats: {
                totalUsers: totalUsers.count,
                activeSessions: activeSessions.count,
                totalModules: totalModules.count,
                activeModules: activeModules.count
            }
        });
        
    } catch (error) {
        console.error('Errore info sistema:', error);
        res.status(500).json({
            success: false,
            message: 'Errore recupero informazioni'
        });
    }
});

module.exports = router;