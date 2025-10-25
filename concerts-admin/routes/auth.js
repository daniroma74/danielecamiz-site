// concerts-admin/routes/auth.js
// Routes per autenticazione temporanea
import { Router } from 'express';
import { showLogin, processLogin, processLogout } from '../middleware/simpleAuth.js';

const router = Router();

// GET /auth/login - Mostra pagina login
router.get('/login', showLogin);

// POST /auth/login - Processa login
router.post('/login', processLogin);

// GET /auth/logout - Logout
router.get('/logout', processLogout);

export default router;