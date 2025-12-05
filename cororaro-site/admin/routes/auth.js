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

    console.log('🔐 Login attempt:', username);

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.redirect('/admin/login?error=missing');
    }

    try {
      // Find user (synchronous with better-sqlite3)
      const user = db.prepare(
        'SELECT * FROM admin_users WHERE username = ? AND is_active = 1'
      ).get(username);

      if (!user) {
        console.log('❌ User not found:', username);
        return res.redirect('/admin/login?error=invalid');
      }

      console.log('✅ User found:', user.username);

      // Check password
      const match = await bcrypt.compare(password, user.password);
      console.log('🔑 Password match:', match);

      if (!match) {
        console.log('❌ Invalid password');
        return res.redirect('/admin/login?error=invalid');
      }

      // Update last login
      db.prepare(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(user.id);

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.fullName = user.full_name;

      console.log('💾 Saving session...', {
        userId: req.session.userId,
        sessionID: req.sessionID
      });

      // Save session before redirect
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          return res.redirect('/admin/login?error=session');
        }
        console.log('✅ Session saved successfully!');
        console.log('🔄 Redirecting to /admin/dashboard');
        res.redirect('/admin/dashboard');
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      return res.redirect('/admin/login?error=server');
    }
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
