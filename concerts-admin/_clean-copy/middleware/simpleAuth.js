// concerts-admin/middleware/simpleAuth.js
// Sistema di autenticazione temporaneo semplice
// Questo file sarà sostituito quando admin-hub sarà pronto

import crypto from 'crypto';

// Credenziali temporanee (da .env)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'concerts2024';

// Utility per hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Middleware: verifica se l'utente è autenticato
export function requireAuth(req, res, next) {
  // Verifica sessione
  if (req.session && req.session.authenticated === true) {
    return next();
  }
  
  // Non autenticato: salva la destinazione e redirect al login
  req.session.returnTo = req.originalUrl;
  return res.redirect('/auth/login');
}

// Controller: mostra pagina login
export function showLogin(req, res) {
  // Se già autenticato, vai alla dashboard
  if (req.session && req.session.authenticated === true) {
    return res.redirect('/admin/dashboard');
  }
  
  res.render('pages/login', {
    title: 'Login - Concerts Admin',
    error: req.query.error || null,
    returnTo: req.session.returnTo || '/admin/dashboard'
  });
}

// Controller: processa login
export function processLogin(req, res) {
  const { username, password } = req.body;
  
  // DEBUG - Rimuovere dopo aver risolto
  console.log('=== LOGIN DEBUG ===');
  console.log('Ricevuto username:', JSON.stringify(username));
  console.log('Ricevuto password:', JSON.stringify(password));
  console.log('Atteso username:', JSON.stringify(ADMIN_USERNAME));
  console.log('Atteso password:', JSON.stringify(ADMIN_PASSWORD));
  console.log('Match username:', username === ADMIN_USERNAME);
  console.log('Match password:', password === ADMIN_PASSWORD);
  console.log('===================');
  
  // Verifica credenziali
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Login riuscito
    req.session.authenticated = true;
    req.session.username = username;
    req.session.loginTime = new Date().toISOString();
    
    console.log('✅ Login SUCCESSO per:', username);
    
    // Redirect alla destinazione originale o dashboard
    const returnTo = req.session.returnTo || '/admin/dashboard';
    delete req.session.returnTo;
    
    return res.redirect(returnTo);
  } else {
    // Login fallito
    console.log('❌ Login FALLITO per:', username);
    return res.redirect('/auth/login?error=invalid');
  }
}

// Controller: logout
export function processLogout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Errore durante logout:', err);
    }
    res.redirect('/auth/login');
  });
}