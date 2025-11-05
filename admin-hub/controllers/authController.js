// Controller per gestione autenticazione e 2FA

const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const { get, run, all } = require('../config/database');
const { generateModuleToken } = require('../middleware/auth');

// Funzione helper per log attività
async function logActivity(action, userId, details = {}) {
    try {
        await run(
            `INSERT INTO hub_activity_logs (user_id, action, details, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                action,
                JSON.stringify(details),
                details.ip || '',
                details.userAgent || ''
            ]
        );
    } catch (error) {
        console.error('Errore log attività:', error);
    }
}

// Funzioni helper per gestione tentativi login
async function checkLoginAttempts(username) {
    const result = await get(
        `SELECT COUNT(*) as attempts FROM hub_login_attempts 
         WHERE username = ? AND created_at > datetime('now', '-15 minutes')`,
        [username]
    );
    return result ? result.attempts : 0;
}

async function incrementLoginAttempts(username, ip) {
    await run(
        'INSERT INTO hub_login_attempts (username, ip_address, success) VALUES (?, ?, 0)',
        [username, ip]
    );
}

async function resetLoginAttempts(username) {
    await run(
        'DELETE FROM hub_login_attempts WHERE username = ?',
        [username]
    );
}

// Mostra pagina login
const showLogin = (req, res) => {
    const returnUrl = req.query.return || '/dashboard';
    const error = req.query.error;
    const expired = req.query.expired;
    
    let errorMessage = '';
    
    if (error === 'invalid_credentials') {
        errorMessage = 'Username o password non validi';
    } else if (error === 'too_many_attempts') {
        errorMessage = 'Troppi tentativi di login. Account temporaneamente bloccato';
    } else if (error === 'missing_credentials') {
        errorMessage = 'Inserisci username e password';
    } else if (error === 'system_error') {
        errorMessage = 'Errore di sistema. Riprova più tardi';
    } else if (error === '2fa_not_configured') {
        errorMessage = 'Autenticazione a due fattori non configurata';
    }
    
    if (expired === 'true') {
        errorMessage = 'Sessione scaduta. Effettua nuovamente il login';
    }
    
    res.render('auth/login', {
        title: 'Login - Admin HUB',
        error: errorMessage,
        returnUrl,
        csrfToken: req.session.csrfToken || uuidv4()
    });
};

// Processo di login
const processLogin = async (req, res) => {
    try {
        const { username, password, remember } = req.body;
        
        // Validazione input
        if (!username || !password) {
            return res.redirect('/auth/login?error=missing_credentials');
        }
        
        // Sanitizzazione username
        const cleanUsername = validator.escape(username.toLowerCase().trim());
        
        // Verifica tentativi di login
        const attempts = await checkLoginAttempts(cleanUsername);
        if (attempts >= 5) {
            await logActivity('login_blocked', null, { 
                username: cleanUsername,
                ip: req.ip 
            });
            return res.redirect('/auth/login?error=too_many_attempts');
        }
        
        // Cerca utente nel database
        const user = await get(
            'SELECT * FROM hub_users WHERE username = ? AND active = 1',
            [cleanUsername]
        );
        
        if (!user) {
            await incrementLoginAttempts(cleanUsername, req.ip);
            await logActivity('login_failed', null, { 
                username: cleanUsername,
                ip: req.ip 
            });
            return res.redirect('/auth/login?error=invalid_credentials');
        }
        
        // Verifica password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            await incrementLoginAttempts(cleanUsername, req.ip);
            await logActivity('login_failed', user.id, { ip: req.ip });
            return res.redirect('/auth/login?error=invalid_credentials');
        }
        
        // Reset tentativi login
        await resetLoginAttempts(cleanUsername);
        
        // Crea sessione
        const sessionId = uuidv4();
        req.session.sessionId = sessionId;
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.email = user.email;
        req.session.role = user.role;
        req.session.permissions = JSON.parse(user.permissions || '[]');
        
        // Salva sessione nel database
        const expiresAt = remember === 'on' 
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 giorni
            : new Date(Date.now() + 60 * 60 * 1000); // 1 ora
            
        await run(
            `INSERT INTO hub_sessions (id, user_id, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?)`,
            [sessionId, user.id, req.ip, req.get('user-agent'), expiresAt.toISOString()]
        );
        
        // Aggiorna ultimo login
        await run(
            'UPDATE hub_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );
        
        // Se remember me è attivo
        if (remember === 'on') {
            req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 giorni
        }
        
        // Gestione 2FA
        if (user.two_factor_enabled) {
            req.session.requires2FA = true;
            req.session.verified2FA = false;
            req.session.authenticated = false;
            
            await logActivity('login_2fa_required', user.id, { ip: req.ip });
            return res.redirect('/auth/two-factor');
        }
        
        // Login completato senza 2FA
        req.session.authenticated = true;
        
        await logActivity('login_success', user.id, { ip: req.ip });
        
        // Redirect a destinazione o dashboard
        const returnUrl = req.body.returnUrl || '/dashboard';
        res.redirect(returnUrl);
        
    } catch (error) {
        console.error('Errore login:', error);
        res.redirect('/auth/login?error=system_error');
    }
};

// Mostra pagina 2FA
const show2FA = (req, res) => {
    if (!req.session.requires2FA) {
        return res.redirect('/dashboard');
    }
    
    res.render('auth/twoFactor', {
        title: 'Verifica 2FA - Admin HUB',
        username: req.session.username,
        error: req.query.error === 'invalid_code' ? 'Codice non valido' : null
    });
};

// Verifica codice 2FA
const verify2FA = async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code || !req.session.userId) {
            return res.redirect('/auth/two-factor?error=invalid_code');
        }
        
        // Recupera secret utente
        const user = await get(
            'SELECT two_factor_secret FROM hub_users WHERE id = ?',
            [req.session.userId]
        );
        
        if (!user || !user.two_factor_secret) {
            req.session.destroy();
            return res.redirect('/auth/login?error=2fa_not_configured');
        }
        
        // Verifica codice TOTP
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: code,
            window: 2 // Permetti piccola discrepanza temporale
        });
        
        if (!verified) {
            await logActivity('2fa_failed', req.session.userId, { ip: req.ip });
            return res.redirect('/auth/two-factor?error=invalid_code');
        }
        
        // Autorizza sessione completa
        req.session.authenticated = true;
        req.session.verified2FA = true;
        delete req.session.requires2FA;
        
        await logActivity('2fa_success', req.session.userId, { ip: req.ip });
        
        // Vai alla dashboard
        res.redirect('/dashboard');
        
    } catch (error) {
        console.error('Errore verifica 2FA:', error);
        res.redirect('/auth/two-factor?error=system_error');
    }
};

// Setup 2FA per nuovo utente
const setup2FA = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non autorizzato'
            });
        }
        
        // Genera nuovo secret
        const secret = speakeasy.generateSecret({
            name: `Admin HUB (${req.session.username})`,
            issuer: 'danielecamiz.com',
            length: 32
        });
        
        // Salva temporaneamente il secret
        req.session.temp2FASecret = secret.base32;
        
        // Genera QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        
        res.render('auth/setup2FA', {
            title: 'Configura 2FA - Admin HUB',
            qrCode: qrCodeUrl,
            secret: secret.base32,
            manualEntry: secret.base32.match(/.{1,4}/g).join(' ')
        });
        
    } catch (error) {
        console.error('Errore setup 2FA:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore configurazione 2FA' 
        });
    }
};

// Conferma setup 2FA
const confirm2FA = async (req, res) => {
    try {
        const { code } = req.body;
        const secret = req.session.temp2FASecret;
        
        if (!secret) {
            return res.status(400).json({ 
                success: false, 
                message: 'Sessione 2FA non valida' 
            });
        }
        
        // Verifica codice
        const verified = speakeasy.totp.verify({
            secret: secret,
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
        
        // Salva secret nel database
        await run(
            'UPDATE hub_users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE id = ?',
            [secret, req.session.userId]
        );
        
        // Pulisci sessione temporanea
        delete req.session.temp2FASecret;
        
        await logActivity('2fa_enabled', req.session.userId);
        
        res.json({ 
            success: true, 
            message: '2FA configurato con successo' 
        });
        
    } catch (error) {
        console.error('Errore conferma 2FA:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore conferma 2FA' 
        });
    }
};

// Logout
const logout = async (req, res) => {
    try {
        if (req.session && req.session.sessionId) {
            // Rimuovi sessione dal database
            await run(
                'DELETE FROM hub_sessions WHERE id = ?',
                [req.session.sessionId]
            );
            
            if (req.session.userId) {
                await logActivity('logout', req.session.userId, { ip: req.ip });
            }
        }
        
        // Distruggi sessione
        req.session.destroy((err) => {
            if (err) {
                console.error('Errore distruzione sessione:', err);
            }
            // Pulisci cookie con path corretto
            res.clearCookie('hub_session', { path: '/' });
            res.clearCookie('connect.sid', { path: '/' });
            res.redirect('/auth/login');
        });
        
    } catch (error) {
        console.error('Errore logout:', error);
        res.redirect('/auth/login');
    }
};

// Esporta tutte le funzioni
module.exports = {
    showLogin,
    processLogin,
    show2FA,
    verify2FA,
    setup2FA,
    confirm2FA,
    logout
};