// orchestraicnt-site/routes/api.js
const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Impostazioni sito
router.get('/settings', apiController.getSettings);

// Concerti
router.get('/concerts/upcoming', apiController.getUpcomingConcerts);

module.exports = router;
