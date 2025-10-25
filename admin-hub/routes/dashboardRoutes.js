// Routes per dashboard e gestione moduli

const express = require('express');
const router = express.Router();
const {
    showDashboard,
    getModuleDetails,
    updateModuleStatus
} = require('../controllers/dashboardController');
const { requireRole } = require('../middleware/auth');

// Dashboard principale
router.get('/', showDashboard);

// Dettagli modulo
router.get('/module/:moduleId', getModuleDetails);

// Aggiorna stato modulo (solo admin)
router.put('/module/:moduleId/status', requireRole('admin'), updateModuleStatus);

// Refresh dashboard data (AJAX)
router.get('/refresh', async (req, res) => {
    try {
        const { all, get } = require('../config/database');
        
        // Ottieni dati aggiornati
        const onlineUsers = await get(
            `SELECT COUNT(DISTINCT user_id) as count 
             FROM user_sessions 
             WHERE expires_at > datetime('now')`
        );
        
        const activities = await all(
            `SELECT a.*, u.username 
             FROM activity_logs a
             LEFT JOIN users u ON a.user_id = u.id
             ORDER BY a.created_at DESC
             LIMIT 5`
        );
        
        res.json({
            success: true,
            data: {
                onlineUsers: onlineUsers.count,
                activities: activities.map(a => ({
                    action: a.action,
                    username: a.username,
                    time: new Date(a.created_at).toLocaleString('it-IT')
                }))
            }
        });
        
    } catch (error) {
        console.error('Errore refresh dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Errore aggiornamento dati'
        });
    }
});

module.exports = router;