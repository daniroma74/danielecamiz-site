#!/usr/bin/env node

// Script per creare l'utente amministratore iniziale

const readline = require('readline');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Carica variabili ambiente
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Importa database
const { get, run } = require('../config/database');

// Colori per output console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

// Interfaccia readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Funzione per fare domande
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Validazione email
const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Validazione password
const isValidPassword = (password) => {
    if (password.length < 8) {
        console.log(`${colors.red}❌ La password deve essere di almeno 8 caratteri${colors.reset}`);
        return false;
    }
    if (!/[A-Z]/.test(password)) {
        console.log(`${colors.red}❌ La password deve contenere almeno una lettera maiuscola${colors.reset}`);
        return false;
    }
    if (!/[a-z]/.test(password)) {
        console.log(`${colors.red}❌ La password deve contenere almeno una lettera minuscola${colors.reset}`);
        return false;
    }
    if (!/[0-9]/.test(password)) {
        console.log(`${colors.red}❌ La password deve contenere almeno un numero${colors.reset}`);
        return false;
    }
    return true;
};

// Funzione principale
async function createAdmin() {
    console.log(`
${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════╗
║         CREAZIONE UTENTE AMMINISTRATORE      ║
╚══════════════════════════════════════════════╝
${colors.reset}
Questo script ti guiderà nella creazione dell'utente amministratore principale.
`);
    
    try {
        // Verifica se esiste già un admin
        const existingAdmin = await get(
            "SELECT COUNT(*) as count FROM hub_users WHERE role = 'admin'"
        );
        
        if (existingAdmin.count > 0) {
            console.log(`${colors.yellow}⚠️  Esiste già un utente amministratore.${colors.reset}`);
            const overwrite = await question('Vuoi crearne un altro? (s/n): ');
            
            if (overwrite.toLowerCase() !== 's') {
                console.log('Operazione annullata.');
                process.exit(0);
            }
        }
        
        // Raccolta dati
        console.log(`\n${colors.bright}Inserisci i dati dell'amministratore:${colors.reset}\n`);
        
        let username, email, password;
        
        // Username
        while (!username) {
            username = await question('Username: ');
            username = username.trim().toLowerCase();
            
            if (username.length < 3) {
                console.log(`${colors.red}❌ Username deve essere di almeno 3 caratteri${colors.reset}`);
                username = null;
                continue;
            }
            
            // Verifica unicità
            const existing = await get(
                'SELECT id FROM hub_users WHERE username = ?',
                [username]
            );
            
            if (existing) {
                console.log(`${colors.red}❌ Username già esistente${colors.reset}`);
                username = null;
            }
        }
        
        // Email
        while (!email) {
            email = await question('Email: ');
            email = email.trim().toLowerCase();
            
            if (!isValidEmail(email)) {
                console.log(`${colors.red}❌ Email non valida${colors.reset}`);
                email = null;
                continue;
            }
            
            // Verifica unicità email
            const existingEmail = await get(
                'SELECT id FROM hub_users WHERE email = ?',
                [email]
            );
            
            if (existingEmail) {
                console.log(`${colors.red}❌ Email già registrata${colors.reset}`);
                email = null;
            }
        }
        
        // Password
        while (!password) {
            password = await question('Password (min 8 caratteri, 1 maiuscola, 1 minuscola, 1 numero): ');
            
            if (!isValidPassword(password)) {
                password = null;
                continue;
            }
            
            const confirmPassword = await question('Conferma password: ');
            
            if (password !== confirmPassword) {
                console.log(`${colors.red}❌ Le password non corrispondono${colors.reset}`);
                password = null;
            }
        }
        
        // 2FA setup
        const setup2FA = await question('\nVuoi configurare l\'autenticazione a due fattori (2FA)? (s/n): ');
        
        let twoFactorSecret = null;
        let twoFactorEnabled = 0;
        
        if (setup2FA.toLowerCase() === 's') {
            // Genera secret 2FA
            const secret = speakeasy.generateSecret({
                name: `Admin HUB - ${username}`,
                issuer: 'danielecamiz.com',
                length: 32
            });
            
            twoFactorSecret = secret.base32;
            
            // Genera QR code
            const qrCodeData = await QRCode.toDataURL(secret.otpauth_url);
            
            // Salva QR code temporaneo
            const qrPath = path.join(__dirname, '..', `qr-${username}.html`);
            const qrHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>2FA Setup - ${username}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
        }
        h1 { color: #333; }
        .secret-code {
            background: #f0f0f0;
            padding: 1rem;
            border-radius: 5px;
            font-family: monospace;
            font-size: 1.1rem;
            margin: 1rem 0;
            word-break: break-all;
        }
        .instructions {
            text-align: left;
            margin: 1rem 0;
        }
        .instructions li {
            margin: 0.5rem 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Configurazione 2FA</h1>
        <p>Utente: <strong>${username}</strong></p>
        
        <img src="${qrCodeData}" alt="QR Code 2FA" />
        
        <div class="secret-code">
            ${secret.base32.match(/.{1,4}/g).join(' ')}
        </div>
        
        <div class="instructions">
            <h3>Istruzioni:</h3>
            <ol>
                <li>Installa un'app authenticator (Google Authenticator, Authy, etc)</li>
                <li>Scansiona il QR code o inserisci manualmente il codice</li>
                <li>Conserva questo codice in un luogo sicuro</li>
                <li>Elimina questo file dopo la configurazione</li>
            </ol>
        </div>
        
        <p><strong>IMPORTANTE:</strong> Salva questo codice segreto in un posto sicuro!</p>
    </div>
</body>
</html>`;
            
            fs.writeFileSync(qrPath, qrHtml);
            
            console.log(`\n${colors.green}✓ QR Code salvato in: ${qrPath}${colors.reset}`);
            console.log(`${colors.yellow}⚠️  Apri il file nel browser per configurare l'app authenticator${colors.reset}`);
            console.log(`${colors.yellow}⚠️  Elimina il file dopo la configurazione!${colors.reset}\n`);
            
            // Verifica codice
            let verified = false;
            let attempts = 0;
            
            while (!verified && attempts < 3) {
                const code = await question('Inserisci il codice a 6 cifre dall\'app per verificare: ');
                
                verified = speakeasy.totp.verify({
                    secret: twoFactorSecret,
                    encoding: 'base32',
                    token: code,
                    window: 2
                });
                
                if (!verified) {
                    attempts++;
                    console.log(`${colors.red}❌ Codice non valido. Tentativi rimanenti: ${3 - attempts}${colors.reset}`);
                }
            }
            
            if (verified) {
                twoFactorEnabled = 1;
                console.log(`${colors.green}✓ 2FA configurato con successo!${colors.reset}`);
            } else {
                twoFactorSecret = null;
                console.log(`${colors.yellow}⚠️  2FA non configurato - troppi tentativi falliti${colors.reset}`);
            }
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);
        
        // Crea utente nel database
        const result = await run(
            `INSERT INTO hub_users (
                username, email, password_hash, role, permissions,
                two_factor_enabled, two_factor_secret, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                username,
                email,
                passwordHash,
                'admin',
                JSON.stringify(['*']), // Tutti i permessi
                twoFactorEnabled,
                twoFactorSecret,
                1
            ]
        );
        
        if (result.changes > 0) {
            console.log(`
${colors.green}${colors.bright}
╔══════════════════════════════════════════════╗
║         AMMINISTRATORE CREATO CON SUCCESSO!  ║
╚══════════════════════════════════════════════╝
${colors.reset}
${colors.cyan}Username:${colors.reset} ${username}
${colors.cyan}Email:${colors.reset} ${email}
${colors.cyan}Ruolo:${colors.reset} Amministratore
${colors.cyan}2FA:${colors.reset} ${twoFactorEnabled ? '✓ Attivo' : '✗ Non attivo'}

${colors.yellow}Puoi ora accedere all'Admin HUB con queste credenziali.${colors.reset}

URL: ${colors.bright}http://localhost:${process.env.PORT || 3100}${colors.reset}
            `);
        } else {
            throw new Error('Impossibile creare l\'utente');
        }
        
    } catch (error) {
        console.error(`${colors.red}Errore: ${error.message}${colors.reset}`);
        process.exit(1);
    } finally {
        rl.close();
        process.exit(0);
    }
}

// Esegui
createAdmin();