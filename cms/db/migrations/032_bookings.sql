

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- 032_bookings.sql
-- Porting schema prenotazioni nel DB Unico (main.sqlite)

CREATE TABLE IF NOT EXISTS bookings (
  id               TEXT PRIMARY KEY,
  event_id         TEXT NOT NULL,                 -- identificatore evento lato LP (slug o id testuale)
  code             TEXT,
  email            TEXT NOT NULL,
  first_name       TEXT,
  last_name        TEXT,
  phone            TEXT,
  language         TEXT,
  seats            INTEGER NOT NULL DEFAULT 1,
  note             TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','canceled')),
  newsletter_optin INTEGER NOT NULL DEFAULT 0 CHECK(newsletter_optin IN (0,1)),
  contact_id       INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  created_at       DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at       DATETIME
);

CREATE TABLE IF NOT EXISTS booking_items (
  id         INTEGER PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  item_type  TEXT CHECK(item_type IN ('seat','ticket','other')),
  item_ref   TEXT,
  qty        INTEGER NOT NULL DEFAULT 1,
  price      REAL,
  meta_json  TEXT
);

-- indici
CREATE INDEX IF NOT EXISTS idx_bookings_event_status ON bookings(event_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_email        ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);

-- trigger di servizio
CREATE TRIGGER IF NOT EXISTS trg_bookings_updated_at
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
  UPDATE bookings SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- normalizza email in minuscolo in INSERT
CREATE TRIGGER IF NOT EXISTS trg_bookings_email_lower_ins
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
  SELECT CASE WHEN NEW.email IS NOT NULL THEN NEW.email = lower(NEW.email) END;
END;

-- normalizza email in minuscolo in UPDATE
CREATE TRIGGER IF NOT EXISTS trg_bookings_email_lower_upd
BEFORE UPDATE OF email ON bookings
FOR EACH ROW
BEGIN
  SELECT CASE WHEN NEW.email IS NOT NULL THEN NEW.email = lower(NEW.email) END;
END;

COMMIT;