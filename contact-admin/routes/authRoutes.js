import express from 'express';
const router = express.Router();

// Simple auth for now
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login - Contact Admin', error: req.query.error });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { config } = await import('../config/config.js');

  if (username === config.auth.username && password === config.auth.password) {
    req.session.authenticated = true;
    req.session.username = username;
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/login?error=invalid');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

export default router;
