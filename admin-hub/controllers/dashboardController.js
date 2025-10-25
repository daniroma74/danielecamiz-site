// Controller per gestione dashboard e moduli

const { all, get, run } = require('../config/database');
const modulesConfig = require('../config/modules.json');

// Dashboard principale
const showDashboard = async (req, res) => {
    try {
        // Carica moduli dal database
        const dbModules = await all(
            `SELECT * FROM modules 
             WHERE status != 'disabled' 
             ORDER BY order_index ASC`
        );
        
        // Combina con configurazione statica
        const modules = dbModules.map(dbModule => {
            const configModule = modulesConfig.modules.find(m => m.id === dbModule.id);
            return {
                ...configModule,
                ...dbModule,
                permissions: JSON.parse(dbModule.permissions || '[]'),
                features: JSON.parse(dbModule.features || '[]')
            };
        });
        
        // Filtra moduli per permessi utente
        const userModules = modules.filter(module => {
            if (req.user.role === 'admin') return true;
            return module.permissions.some(perm => 
                req.user.permissions.includes(perm)
            );
        });
        
        // Statistiche dashboard
        const stats = await getDashboardStats(req.user.id);
        
        // Attività recenti
        const activities = await getRecentActivities(req.user.id);
        
        // Formatta ultimo login
        const lastLogin = req.session.lastLogin 
            ? new Date(req.session.lastLogin).toLocaleString('it-IT')
            : 'Prima sessione';
        
        res.render('dashboard/index', {
            title: 'Dashboard - Admin HUB',
            modules: userModules,
            stats,
            activities,
            lastLogin
        });
        
    } catch (error) {
        console.error('Errore dashboard:', error);
        res.status(500).render('errors/500', {
            title: 'Errore',
            message: 'Errore caricamento dashboard'
        });
    }
};

// Ottieni statistiche dashboard
async function getDashboardStats(userId) {
    try {
        // Moduli attivi
        const activeModules = await get(
            "SELECT COUNT(*) as count FROM modules WHERE status = 'active'"
        );
        
        // Utenti online (sessioni attive ultima ora)
        const onlineUsers = await get(
            `SELECT COUNT(DISTINCT user_id) as count 
             FROM user_sessions 
             WHERE expires_at > datetime('now')`
        );
        
        // Ultima attività
        const lastActivity = await get(
            `SELECT created_at FROM activity_logs 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userId]
        );
        
        // Status sicurezza
        const user = await get(
            'SELECT two_factor_enabled FROM users WHERE id = ?',
            [userId]
        );
        
        return {
            activeModules: activeModules.count,
            onlineUsers: onlineUsers.count,
            lastActivity: lastActivity 
                ? formatTimeAgo(new Date(lastActivity.created_at))
                : 'Nessuna attività',
            securityStatus: user.two_factor_enabled ? 'secure' : 'warning',
            securityText: user.two_factor_enabled ? 'Protetto con 2FA' : '2FA non attivo'
        };
        
    } catch (error) {
        console.error('Errore statistiche:', error);
        return {
            activeModules: 0,
            onlineUsers: 0,
            lastActivity: 'N/D',
            securityStatus: 'unknown',
            securityText: 'Stato sconosciuto'
        };
    }
}

// Ottieni attività recenti
async function getRecentActivities(userId) {
    try {
        const activities = await all(
            `SELECT a.*, u.username 
             FROM activity_logs a
             LEFT JOIN users u ON a.user_id = u.id
             ORDER BY a.created_at DESC
             LIMIT 10`
        );
        
        return activities.map(activity => {
            const details = JSON.parse(activity.details || '{}');
            return {
                id: activity.id,
                type: getActivityType(activity.action),
                description: formatActivityDescription(activity.action, activity.username, details),
                time: formatTimeAgo(new Date(activity.created_at)),
                icon: getActivityIcon(activity.action)
            };
        });
        
    } catch (error) {
        console.error('Errore caricamento attività:', error);
        return [];
    }
}

// Dettagli modulo
const getModuleDetails = async (req, res) => {
    try {
        const { moduleId } = req.params;
        
        const module = await get(
            'SELECT * FROM modules WHERE id = ?',
            [moduleId]
        );
        
        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Modulo non trovato'
            });
        }
        
        // Verifica permessi
        const permissions = JSON.parse(module.permissions || '[]');
        if (req.user.role !== 'admin' && 
            !permissions.some(p => req.user.permissions.includes(p))) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato'
            });
        }
        
        res.json({
            success: true,
            module: {
                ...module,
                permissions: permissions,
                features: JSON.parse(module.features || '[]')
            }
        });
        
    } catch (error) {
        console.error('Errore dettagli modulo:', error);
        res.status(500).json({
            success: false,
            message: 'Errore server'
        });
    }
};

// Aggiorna stato modulo
const updateModuleStatus = async (req, res) => {
    try {
        // Solo admin può modificare moduli
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo gli amministratori possono modificare i moduli'
            });
        }
        
        const { moduleId } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['active', 'inactive', 'maintenance', 'planned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Stato non valido'
            });
        }
        
        const result = await run(
            'UPDATE modules SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, moduleId]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Modulo non trovato'
            });
        }
        
        // Log attività
        await run(
            `INSERT INTO activity_logs (user_id, action, details)
             VALUES (?, ?, ?)`,
            [
                req.user.id,
                'module_status_update',
                JSON.stringify({ moduleId, status })
            ]
        );
        
        res.json({
            success: true,
            message: 'Stato modulo aggiornato'
        });
        
    } catch (error) {
        console.error('Errore aggiornamento modulo:', error);
        res.status(500).json({
            success: false,
            message: 'Errore server'
        });
    }
};

// Funzioni helper

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Adesso';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minuti fa`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ore fa`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} giorni fa`;
    
    return date.toLocaleDateString('it-IT');
}

function getActivityType(action) {
    const types = {
        'login_success': 'login',
        'login_failed': 'error',
        'logout': 'logout',
        'module_access': 'module_access',
        'module_status_update': 'update',
        'user_create': 'create',
        'user_update': 'update',
        'settings_update': 'settings',
        '2fa_enabled': 'security',
        '2fa_disabled': 'security'
    };
    
    return types[action] || 'default';
}

function formatActivityDescription(action, username, details) {
    const templates = {
        'login_success': `${username} ha effettuato l'accesso`,
        'login_failed': `Tentativo di accesso fallito per ${username}`,
        'logout': `${username} ha effettuato il logout`,
        'module_access': `${username} ha accesso al modulo ${details.moduleId}`,
        'module_status_update': `Aggiornato stato modulo ${details.moduleId}`,
        'user_create': `Creato nuovo utente: ${details.newUser}`,
        'user_update': `Aggiornato profilo utente`,
        'settings_update': `Modificate impostazioni sistema`,
        '2fa_enabled': `${username} ha attivato 2FA`,
        '2fa_disabled': `${username} ha disattivato 2FA`
    };
    
    return templates[action] || action;
}

function getActivityIcon(action) {
    const icons = {
        'login': '🔑',
        'logout': '🚪',
        'module_access': '🚀',
        'update': '✏️',
        'create': '➕',
        'delete': '🗑️',
        'security': '🔒',
        'settings': '⚙️',
        'error': '❌'
    };
    
    const type = getActivityType(action);
    return icons[type] || '📌';
}

module.exports = {
    showDashboard,
    getModuleDetails,
    updateModuleStatus
};