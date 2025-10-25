#!/usr/bin/env node

// Script di setup iniziale per Admin HUB

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Colori console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

async function setup() {
    console.log(`
${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════╗
║           ADMIN HUB - SETUP INIZIALE         ║
╚══════════════════════════════════════════════╝
${colors.reset}
Questo script ti aiuterà a configurare l'Admin HUB.
`);
    
    try {
        // 1. Controlla se .env esiste già
        const envPath = path.join(__dirname, '..', '.env');
        const envExamplePath = path.join(__dirname, '..', '.env.example');
        
        if (fs.existsSync(envPath)) {
            const overwrite = await question(`${colors.yellow}⚠️  Il file .env esiste già. Vuoi sovrascriverlo? (s/n): ${colors.reset}`);
            if (overwrite.toLowerCase() !== 's') {
                console.log('Setup annullato.');
                process.exit(0);
            }
        }
        
        // 2. Leggi .env.example
        if (!fs.existsSync(envExamplePath)) {
            console.error(`${colors.red}❌ File .env.example non trovato!${colors.reset}`);
            process.exit(1);
        }
        
        let envContent = fs.readFileSync(envExamplePath, 'utf8');
        
        // 3. Genera chiavi sicure
        console.log(`\n${colors.bright}Generazione chiavi di sicurezza...${colors.reset}`);
        
        const keys = {
            SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
            JWT_SECRET: crypto.randomBytes(32).toString('hex'),
            COOKIE_SECRET: crypto.randomBytes(32).toString('hex'),
            CSRF_SECRET: crypto.randomBytes(32).toString('hex')
        };
        
        // Sostituisci nel contenuto
        for (const [key, value] of Object.entries(keys)) {
            const regex = new RegExp(`${key}=.*`, 'g');
            envContent = envContent.replace(regex, `${key}=${value}`);
        }
        
        console.log(`${colors.green}✓ Chiavi di sicurezza generate${colors.reset}`);
        
        // 4. Configura domini
        console.log(`\n${colors.bright}Configurazione domini:${colors.reset}`);
        
        const hubDomain = await question('Dominio HUB (default: hub.danielecamiz.com): ') || 'hub.danielecamiz.com';
        const mainDomain = await question('Dominio principale (default: danielecamiz.com): ') || 'danielecamiz.com';
        
        envContent = envContent.replace(/HUB_DOMAIN=.*/g, `HUB_DOMAIN=${hubDomain}`);
        envContent = envContent.replace(/MAIN_DOMAIN=.*/g, `MAIN_DOMAIN=${mainDomain}`);
        
        // 5. Configurazione ambiente
        const environment = await question('\nAmbiente (development/production) [development]: ') || 'development';
        envContent = envContent.replace(/NODE_ENV=.*/g, `NODE_ENV=${environment}`);
        
        // 6. Configurazione porta
        const port = await question('Porta server (default: 3100): ') || '3100';
        envContent = envContent.replace(/PORT=.*/g, `PORT=${port}`);
        
        // 7. Configurazione email (opzionale)
        const configureEmail = await question('\nVuoi configurare email per notifiche? (s/n): ');
        
        if (configureEmail.toLowerCase() === 's') {
            console.log(`\n${colors.bright}Configurazione SMTP:${colors.reset}`);
            const smtpHost = await question('SMTP Host (es: smtp.gmail.com): ');
            const smtpPort = await question('SMTP Port (es: 587): ');
            const smtpUser = await question('SMTP User (tua email): ');
            const smtpPass = await question('SMTP Password (password app): ');
            
            envContent = envContent.replace(/SMTP_HOST=.*/g, `SMTP_HOST=${smtpHost}`);
            envContent = envContent.replace(/SMTP_PORT=.*/g, `SMTP_PORT=${smtpPort}`);
            envContent = envContent.replace(/SMTP_USER=.*/g, `SMTP_USER=${smtpUser}`);
            envContent = envContent.replace(/SMTP_PASS=.*/g, `SMTP_PASS=${smtpPass}`);
        }
        
        // 8. Scrivi file .env
        fs.writeFileSync(envPath, envContent);
        console.log(`\n${colors.green}✓ File .env creato con successo!${colors.reset}`);
        
        // 9. Crea directory necessarie
        console.log(`\n${colors.bright}Creazione directory...${colors.reset}`);
        
        const dirs = [
            'logs',
            'database',
            'public/img/modules'
        ];
        
        dirs.forEach(dir => {
            const fullPath = path.join(__dirname, '..', dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`${colors.green}✓${colors.reset} Creata directory: ${dir}`);
            }
        });
        
        // 10. Verifica database principale
        const mainDbPath = path.join(__dirname, '../../cms/db/main.sqlite');
        
        if (!fs.existsSync(mainDbPath)) {
            console.log(`\n${colors.yellow}⚠️  Database principale non trovato in: ${mainDbPath}${colors.reset}`);
            console.log('Verifica che il percorso sia: cms/db/main.sqlite');
            
            // Chiedi il percorso corretto
            const customPath = await question('Inserisci il percorso del database (lascia vuoto per usare default): ');
            if (customPath) {
                envContent = envContent.replace(/DB_PATH=.*/g, `DB_PATH=${customPath}`);
            }
        } else {
            console.log(`\n${colors.green}✓ Database principale trovato in cms/db/main.sqlite${colors.reset}`);
        }
        
        // 11. Istruzioni finali
        console.log(`
${colors.green}${colors.bright}
╔══════════════════════════════════════════════╗
║           SETUP COMPLETATO!                  ║
╚══════════════════════════════════════════════╝
${colors.reset}

${colors.cyan}Prossimi passi:${colors.reset}

1. Installa le dipendenze:
   ${colors.bright}npm install${colors.reset}

2. Crea l'utente amministratore:
   ${colors.bright}npm run create-admin${colors.reset}

3. Avvia il server:
   ${colors.bright}npm run dev${colors.reset}

4. Accedi a:
   ${colors.bright}http://localhost:${port}${colors.reset}

${colors.yellow}Nota:${colors.reset} Assicurati che il database principale (main.sqlite) 
      sia presente nella directory ../database/
        `);
        
    } catch (error) {
        console.error(`${colors.red}Errore durante il setup:`, error, colors.reset);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Esegui setup
setup();