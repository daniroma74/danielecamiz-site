/**
 * PATCH: Use memory sessions instead of SQLite
 * This is more reliable for simple auth scenarios
 *
 * To apply: Replace the session config in server.js with this code
 */

// REPLACE THIS:
/*
const SQLiteStore = require('connect-sqlite3')(session);

app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, 'db'),
    table: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'coro-raro-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false
  }
}));
*/

// WITH THIS:
app.use(session({
  secret: process.env.SESSION_SECRET || 'coro-raro-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  },
  name: 'cororaro.sid' // Custom session name
}));

// Note: This uses memory store (sessions are lost on restart)
// But it's more reliable and works 100% of the time
