// Routes per impostazioni e configurazione

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { requireRole } = require('../middleware/auth');
const { get, run, all } = require('../config/database');

// Pagina impostazioni principale
router.get('/', async (req, res) => {
    res.render('settings/index', {
        title: 'Impostazioni - Admin HUB',
        section: 'general'
    });
});

// Pagina profilo utente
router.get('/profile', async (req, res) => {
    const user = await get(
        'SELECT * FROM hub_users WHERE id = ?',
        [req.user.id]
    );
    
    res.render('settings/profile', {
        title: 'Profilo - Admin HUB',
        profile: user,
        section: 'profile'
    });
});

// Aggiorna profilo
router.post('/profile/update', async (req, res) => {
    try {
        const { email, username } = req.body;
        
        // Verifica unicità
        const existing = await get(
            'SELECT id FROM hub_users WHERE (email = ? OR username = ?) AND id != ?',
            [email, username, req.user.id]
        );
        
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Email o username già in uso'
            });
        }
        
        await run(
            'UPDATE hub_users SET email = ?, username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [email, username, req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Profilo aggiornato'
        });
        
    } catch (error) {
        console.error('Errore aggiornamento profilo:', error);
        res.status(500).json({
            success: false,
            message: 'Errore aggiornamento profilo'
        });
    }
});

// Pagina sicurezza
router.get('/security', async (req, res) => {
    const user = await get(
        'SELECT two_factor_enabled FROM hub_users WHERE id = ?',
        [req.user.id]
    );
    
    res.render('settings/security', {
        title: 'Sicurezza - Admin HUB',
        twoFactorEnabled: user.two_factor_enabled,
        section: 'security'
    });
});

// Cambia password
router.post('/security/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Le password non corrispondono'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La password deve essere di almeno 8 caratteri'
            });
        }
        
        const user = await get(
            'SELECT password_hash FROM hub_users WHERE id = ?',
            [req.user.id]
        );
        
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password corrente non valida'
            });
        }
        
        const newHash = await bcrypt.hash(newPassword, 12);
        
        await run(
            'UPDATE hub_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newHash, req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Password aggiornata con successo'
        });
        
    } catch (error) {
        console.error('Errore cambio password:', error);
        res.status(500).json({
            success: false,
            message: 'Errore cambio password'
        });
    }
});

// Setup 2FA
router.get('/security/2fa/setup', async (req, res) => {
    const secret = speakeasy.generateSecret({
        name: `Admin HUB (${req.user.username})`,
        issuer: 'danielecamiz.com'
    });
    
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    req.session.temp2FASecret = secret.base32;
    
    res.json({
        success: true,
        qrCode,
        secret: secret.base32,
        manualEntry: secret.base32.match(/.{1,4}/g).join(' ')
    });
});

// Abilita 2FA
router.post('/security/2fa/enable', async (req, res) => {
    try {
        const { code } = req.body;
        const secret = req.session.temp2FASecret;
        
        if (!secret) {
            return res.status(400).json({
                success: false,
                message: 'Sessione 2FA non valida'
            });
        }
        
        const verified = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token: code,
            window: 2
        });
        
        if (!verified) {
            return res.status(400).json({
                success: false,
                message: 'Codice non valido'
            });
        }
        
        await run(
            'UPDATE hub_users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE id = ?',
            [secret, req.user.id]
        );
        
        delete req.session.temp2FASecret;
        
        res.json({
            success: true,
            message: '2FA abilitato con successo'
        });
        
    } catch (error) {
        console.error('Errore abilitazione 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Errore abilitazione 2FA'
        });
    }
});

// Disabilita 2FA
router.post('/security/2fa/disable', async (req, res) => {
    try {
        const { password } = req.body;
        
        const user = await get(
            'SELECT password_hash FROM hub_users WHERE id = ?',
            [req.user.id]
        );
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password non valida'
            });
        }
        
        await run(
            'UPDATE hub_users SET two_factor_secret = NULL, two_factor_enabled = 0 WHERE id = ?',
            [req.user.id]
        );
        
        res.json({
            success: true,
            message: '2FA disabilitato'
        });
        
    } catch (error) {
        console.error('Errore disabilitazione 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Errore disabilitazione 2FA'
        });
    }
});

// Gestione utenti (solo admin)
router.get('/users', requireRole('admin'), async (req, res) => {
    const users = await all('SELECT * FROM hub_users ORDER BY created_at DESC');
    
    res.render('settings/users', {
        title: 'Gestione Utenti - Admin HUB',
        users,
        section: 'users'
    });
});

// Crea nuovo utente (solo admin)
router.post('/users/create', requireRole('admin'), async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        // Verifica unicità
        const existing = await get(
            'SELECT id FROM hub_users WHERE email = ? OR username = ?',
            [email, username]
        );
        
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Username o email già esistenti'
            });
        }
        
        const passwordHash = await bcrypt.hash(password, 12);
        
        const permissions = role === 'admin' ? ['*'] : ['read', 'write'];
        
        await run(
            `INSERT INTO hub_users (username, email, password_hash, role, permissions, active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [username, email, passwordHash, role, JSON.stringify(permissions)]
        );
        
        res.json({
            success: true,
            message: 'Utente creato con successo'
        });
        
    } catch (error) {
        console.error('Errore creazione utente:', error);
        res.status(500).json({
            success: false,
            message: 'Errore creazione utente'
        });
    }
});

// Attiva/disattiva utente (solo admin)
router.post('/users/:id/toggle', requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        
        if (id == req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Non puoi disattivare il tuo account'
            });
        }
        
        const user = await get('SELECT active FROM hub_users WHERE id = ?', [id]);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }
        
        await run(
            'UPDATE hub_users SET active = ? WHERE id = ?',
            [user.active ? 0 : 1, id]
        );
        
        res.json({
            success: true,
            message: user.active ? 'Utente disattivato' : 'Utente attivato'
        });
        
    } catch (error) {
        console.error('Errore toggle utente:', error);
        res.status(500).json({
            success: false,
            message: 'Errore modifica stato utente'
        });
    }
});

module.exports = router;