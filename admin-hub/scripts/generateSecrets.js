#!/usr/bin/env node

// Script per generare chiavi sicure per .env

const crypto = require('crypto');

console.log(`
════════════════════════════════════════════════
     GENERATORE CHIAVI SICURE - ADMIN HUB
════════════════════════════════════════════════

Copia queste chiavi nel tuo file .env:
`);

// Genera chiavi
const keys = {
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),  
    COOKIE_SECRET: crypto.randomBytes(32).toString('hex'),
    CSRF_SECRET: crypto.randomBytes(32).toString('hex')
};

// Mostra chiavi
for (const [key, value] of Object.entries(keys)) {
    console.log(`${key}=${value}`);
}

console.log(`
════════════════════════════════════════════════

IMPORTANTE: 
- Ogni chiave è unica e casuale
- Non condividere mai queste chiavi
- Usa chiavi diverse per produzione e sviluppo
- Salva una copia sicura delle chiavi
`);