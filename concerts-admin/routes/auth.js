// concerts-admin/routes/auth.js
// Routes per autenticazione temporanea
import { Router } from 'express';
import { handleLogin, handleLogout } from '../middleware/simpleAuth.js';

const router = Router();

// GET /auth/login - Mostra pagina login
router.get('/login', (req, res) => {
  res.render('pages/login', {
    title: 'Login - Concerts Admin',
    error: req.query.expired ? 'Sessione scaduta' : null,
    redirect: req.query.redirect || '/admin/dashboard'
  });
});

// POST /auth/login - Processa login
router.post('/login', handleLogin);

// GET /auth/logout - Logout
router.get('/logout', handleLogout);

export default router;