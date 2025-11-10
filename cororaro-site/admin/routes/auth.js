/**
 * Admin Authentication Routes
 */

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { redirectIfAuthenticated } = require('../middleware/auth');

module.exports = (db) => {
  // GET /admin/login
  router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('login', {
      error: req.query.error,
      title: 'Login Admin',
      layout: false
    });
  });

  // POST /admin/login
  router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.redirect('/admin/login?error=missing');
    }

    // Find user
    db.get(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
      [username],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.redirect('/admin/login?error=server');
        }

        if (!user) {
          return res.redirect('/admin/login?error=invalid');
        }

        // Check password
        try {
          const match = await bcrypt.compare(password, user.password);

          if (!match) {
            return res.redirect('/admin/login?error=invalid');
          }

          // Update last login
          db.run(
            'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
          );

          // Set session
          req.session.userId = user.id;
          req.session.username = user.username;
          req.session.fullName = user.full_name;

          res.redirect('/admin/dashboard');
        } catch (error) {
          console.error('Password comparison error:', error);
          return res.redirect('/admin/login?error=server');
        }
      }
    );
  });

  // GET /admin/logout
  router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
      res.redirect('/admin/login');
    });
  });

  return router;
};
