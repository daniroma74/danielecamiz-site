// orchestraicnt-site/admin/controllers/authController.js
const bcrypt = require('bcryptjs');

/**
 * GET /admin/login
 * Mostra il form di login
 */
function showLogin(req, res) {
  res.render('admin/views/login', {
    error: null
  });
}

/**
 * POST /admin/login
 * Gestisce il login
 */
async function handleLogin(req, res) {
  const { username, password } = req.body;

  // Validazione input
  if (!username || !password) {
    return res.render('admin/views/login', {
      error: 'Username e password sono obbligatori'
    });
  }

  // Credenziali da .env
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  // Se non c'è password configurata, nega accesso
  if (!ADMIN_PASSWORD) {
    console.error('[Auth] ADMIN_PASSWORD non configurata in .env');
    return res.render('admin/views/login', {
      error: 'Configurazione server non valida. Contatta l\'amministratore.'
    });
  }

  try {
    // Confronta username
    if (username !== ADMIN_USERNAME) {
      return res.render('admin/views/login', {
        error: 'Credenziali non valide'
      });
    }

    // Confronta password
    // Se la password in .env inizia con $2a$ o $2b$, è già hashata con bcrypt
    let passwordMatch = false;

    if (ADMIN_PASSWORD.startsWith('$2a$') || ADMIN_PASSWORD.startsWith('$2b$')) {
      // Password hashata, usa bcrypt per confrontare
      passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD);
    } else {
      // Password in chiaro (per semplicità in sviluppo), confronto diretto
      passwordMatch = (password === ADMIN_PASSWORD);
    }

    if (!passwordMatch) {
      return res.render('admin/views/login', {
        error: 'Credenziali non valide'
      });
    }

    // Login riuscito, crea sessione
    req.session.authenticated = true;
    req.session.username = username;

    console.log(`[Auth] Login riuscito per utente: ${username}`);

    // Redirect al pannello admin
    res.redirect('/admin/settings');

  } catch (error) {
    console.error('[Auth] Errore durante login:', error);
    res.render('admin/views/login', {
      error: 'Errore durante il login. Riprova.'
    });
  }
}

/**
 * GET /admin/logout
 * Logout e distruggi sessione
 */
function handleLogout(req, res) {
  const username = req.session?.username;

  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Errore durante logout:', err);
    } else {
      console.log(`[Auth] Logout riuscito per utente: ${username}`);
    }

    // Redirect alla home
    res.redirect('/');
  });
}

module.exports = {
  showLogin,
  handleLogin,
  handleLogout
};
