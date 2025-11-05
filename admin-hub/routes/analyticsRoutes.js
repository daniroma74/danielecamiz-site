// routes/analyticsRoutes.js
// API Routes per Analytics Centralizzate

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/auth');

// ============================================
// PUBLIC TRACKING ENDPOINT (no auth)
// ============================================

// Track eventi da qualsiasi modulo
// POST /api/analytics/track
// Body: { module, type, category, label, value }
router.post('/track', analyticsController.trackEvent);

// ============================================
// PROTECTED QUERY ENDPOINTS (auth required)
// ============================================

// Dashboard summary (ultimi N giorni)
// GET /api/analytics/summary?days=30&module=contact-site
router.get('/summary', verifyToken, analyticsController.getSummary);

// Dettagli per modulo specifico
// GET /api/analytics/module/:moduleId?days=30
router.get('/module/:moduleId', verifyToken, analyticsController.getModuleStats);

// Top performing content
// GET /api/analytics/top?days=30&limit=10
router.get('/top', verifyToken, analyticsController.getTopContent);

// Daily stats per grafico
// GET /api/analytics/daily?days=90&module=contact-site
router.get('/daily', verifyToken, analyticsController.getDailyStats);

// Export data (CSV o JSON)
// GET /api/analytics/export?format=csv&days=30&module=contact-site
router.get('/export', verifyToken, analyticsController.exportData);

// Statistiche real-time (ultimi 5 minuti)
// GET /api/analytics/realtime
router.get('/realtime', verifyToken, analyticsController.getRealtimeStats);

// ============================================
// ADMIN MANAGEMENT
// ============================================

// Cancella vecchi dati (oltre X giorni)
// DELETE /api/analytics/cleanup?days=365
router.delete('/cleanup', verifyToken, analyticsController.cleanupOldData);

module.exports = router;
