// orchestraicnt-site/admin/routes/admin.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Dashboard
router.get('/', (req, res) => {
  res.redirect('/admin/settings');
});

// Impostazioni
router.get('/settings', settingsController.showSettings);
router.post('/settings', settingsController.updateSettings);

module.exports = router;
