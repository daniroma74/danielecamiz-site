PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  code TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'it',
  status TEXT NOT NULL CHECK(status IN ('confirmed','waitlisted')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id TEXT NOT NULL,
  ticket_type TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK(qty > 0),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bookings_event_status ON bookings(event_id, status);
