// Routes per autenticazione, login, logout, 2FA

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const {
    showLogin,
    processLogin,
    show2FA,
    verify2FA,
    setup2FA,
    confirm2FA,
    logout
} = require('../controllers/authController');

// Pagina login (GET)
router.get('/login', showLogin);

// Processo login (POST)
router.post('/login', processLogin);

// Pagina 2FA (GET)
router.get('/two-factor', show2FA);

// Verifica 2FA (POST)
router.post('/two-factor/verify', verify2FA);

// Setup 2FA (GET) - per utenti autenticati che vogliono abilitarlo
router.get('/two-factor/setup', setup2FA);

// Conferma 2FA (POST)
router.post('/two-factor/confirm', confirm2FA);

// Logout (GET)
router.get('/logout', logout);

module.exports = router;