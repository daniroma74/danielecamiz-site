// orchestraicnt-site/admin/routes/admin.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authController = require('../controllers/authController');
const { requireAuth, redirectIfAuth } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

// Login
router.get('/login', redirectIfAuth, authController.showLogin);
router.post('/login', authController.handleLogin);

// Logout
router.get('/logout', authController.handleLogout);

// ============================================
// PROTECTED ROUTES (auth required)
// ============================================

// Dashboard
router.get('/', requireAuth, (req, res) => {
  res.redirect('/admin/settings');
});

// Impostazioni
router.get('/settings', requireAuth, settingsController.showSettings);
router.post('/settings', requireAuth, settingsController.updateSettings);

module.exports = router;
