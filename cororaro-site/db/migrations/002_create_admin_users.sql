-- Admin Users Table

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,  -- bcrypt hash
  email TEXT,
  full_name TEXT,
  is_active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin (password: admin123)
-- Bcrypt hash of 'admin123'
INSERT OR IGNORE INTO admin_users (username, password, email, full_name)
VALUES ('admin', '$2b$10$rKvVPZR7LZXc8qZJ5kN0eO.4K9PJYx8WZPJhqVQHlU6xkVzKYmYsO', 'admin@cororaro.it', 'Amministratore');

-- Sessions table for express-session
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  expires INTEGER NOT NULL,
  data TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
