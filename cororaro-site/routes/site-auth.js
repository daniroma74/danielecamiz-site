/**
 * Site Authentication Routes (for staging)
 */

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const path = require('path');

module.exports = (db) => {
  // GET /login - Site login page
  router.get('/login', (req, res) => {
    // If already authenticated, redirect to home
    if (req.session && req.session.userId) {
      return res.redirect('/');
    }

    const error = req.query.error;
    res.send(`
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accedi - Coro Raro Staging</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #8B4513 0%, #4a7c59 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .login-container {
      background: white;
      padding: 3rem 2.5rem;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      width: 100%;
    }

    .logo {
      text-align: center;
      margin-bottom: 2rem;
    }

    .logo h1 {
      font-size: 2rem;
      color: #8B4513;
      margin-bottom: 0.5rem;
    }

    .logo p {
      color: #666;
      font-size: 0.95rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
      font-size: 0.95rem;
    }

    input {
      width: 100%;
      padding: 0.9rem 1rem;
      border: 2px solid #ddd;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.3s;
    }

    input:focus {
      outline: none;
      border-color: #8B4513;
      box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.1);
    }

    .btn {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #8B4513 0%, #4a7c59 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 0.5rem;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .error {
      background: #fee;
      color: #c33;
      padding: 1rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
      text-align: center;
    }

    .info {
      background: #e3f2fd;
      color: #1976d2;
      padding: 1rem;
      border-radius: 10px;
      margin-top: 1.5rem;
      font-size: 0.9rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">
      <h1>🎵 Coro Raro</h1>
      <p>Staging - Accesso Protetto</p>
    </div>

    ${error === 'invalid' ? '<div class="error">❌ Credenziali non valide</div>' : ''}
    ${error === 'missing' ? '<div class="error">⚠️ Inserisci username e password</div>' : ''}
    ${error === 'server' ? '<div class="error">🔧 Errore del server</div>' : ''}

    <form method="POST" action="/auth/login">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" required autofocus placeholder="admin">
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required placeholder="••••••••">
      </div>

      <button type="submit" class="btn">🔓 Accedi</button>
    </form>

    <div class="info">
      💡 Usa le credenziali ricevute per accedere al sito staging
    </div>
  </div>
</body>
</html>
    `);
  });

  // POST /auth/login - Process site login
  router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    console.log('🔐 Site login attempt:', username);

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.redirect('/login?error=missing');
    }

    // Check credentials against admin_users table
    db.get(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
      [username],
      async (err, user) => {
        if (err) {
          console.error('❌ Database error:', err);
          return res.redirect('/login?error=server');
        }

        if (!user) {
          console.log('❌ User not found:', username);
          return res.redirect('/login?error=invalid');
        }

        console.log('✅ User found:', user.username);

        // Check password
        try {
          const match = await bcrypt.compare(password, user.password);
          console.log('🔑 Password match:', match);

          if (!match) {
            console.log('❌ Invalid password');
            return res.redirect('/login?error=invalid');
          }

          // Set session (same session used for admin)
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
              return res.redirect('/login?error=server');
            }
            console.log('✅ Session saved successfully!');
            console.log('🔄 Redirecting to homepage');
            res.redirect('/');
          });
        } catch (error) {
          console.error('❌ Password comparison error:', error);
          return res.redirect('/login?error=server');
        }
      }
    );
  });

  // GET /logout - Logout (works for both site and admin)
  router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
      res.redirect('/login');
    });
  });

  return router;
};
