// Test session configuration
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Database
const DB_PATH = path.join(__dirname, 'db', 'cororaro.db');
const db = new sqlite3.Database(DB_PATH);

// Session middleware
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, 'db'),
    table: 'sessions'
  }),
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false
  }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Test routes
app.get('/', (req, res) => {
  res.send(`
    <h1>Session Test</h1>
    <p>Session ID: ${req.sessionID}</p>
    <p>User ID: ${req.session.userId || 'Not logged in'}</p>
    <form method="POST" action="/login">
      <input name="username" value="admin" placeholder="Username"><br>
      <input name="password" type="password" value="admin123" placeholder="Password"><br>
      <button type="submit">Login</button>
    </form>
    <br>
    <a href="/check">Check Session</a> | <a href="/logout">Logout</a>
  `);
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  console.log('Login attempt:', username);

  db.get('SELECT * FROM admin_users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('DB Error:', err);
      return res.send('DB Error: ' + err.message);
    }

    if (!user) {
      console.log('User not found');
      return res.send('User not found');
    }

    console.log('User found:', user.username);

    const match = await bcrypt.compare(password, user.password);
    console.log('Password match:', match);

    if (!match) {
      return res.send('Invalid password');
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;

    console.log('Session before save:', req.session);

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.send('Session save error: ' + err.message);
      }

      console.log('Session saved successfully');
      console.log('Session ID:', req.sessionID);

      res.redirect('/');
    });
  });
});

app.get('/check', (req, res) => {
  res.json({
    sessionID: req.sessionID,
    session: req.session,
    userId: req.session.userId,
    username: req.session.username
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/');
  });
});

const PORT = 3125;
app.listen(PORT, () => {
  console.log(`
  ==========================================
  🧪 Session Test Server Running
  ==========================================
  URL: http://localhost:${PORT}

  Test Steps:
  1. Open http://localhost:${PORT}
  2. Click Login (credentials pre-filled)
  3. Check if userId appears after redirect
  4. Click "Check Session" to see session data
  ==========================================
  `);
});
