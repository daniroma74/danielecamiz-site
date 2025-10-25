

-- 015_mailing.sql
-- Mailing & Contacts: contacts, lists, list_subscriptions, consents
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- CONTACTS ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT    NOT NULL UNIQUE,
  name            TEXT,                           -- opzionale
  source          TEXT,                           -- es. 'mailchimp-import', 'booking', 'manual'
  status          TEXT    NOT NULL DEFAULT 'subscribed'
                         CHECK (status IN ('subscribed','unsubscribed','canceled','bounced')),
  subscribed_at   TEXT,                           -- popolato quando status diventa subscribed
  unsubscribed_at TEXT,                           -- popolato quando status diventa unsubscribed
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (instr(email,'@') > 1)
);

CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at);

-- updated_at + subscribe/unsubscribe timestamps
DROP TRIGGER IF EXISTS trg_contacts_updated_at_ins;
DROP TRIGGER IF EXISTS trg_contacts_updated_at_upd;
DROP TRIGGER IF EXISTS trg_contacts_status_subscribed;
DROP TRIGGER IF EXISTS trg_contacts_status_unsubscribed;

CREATE TRIGGER trg_contacts_updated_at_ins
AFTER INSERT ON contacts
BEGIN
  UPDATE contacts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_contacts_updated_at_upd
AFTER UPDATE ON contacts
BEGIN
  UPDATE contacts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_contacts_status_subscribed
AFTER UPDATE OF status ON contacts
WHEN NEW.status = 'subscribed'
BEGIN
  UPDATE contacts SET subscribed_at = COALESCE(NEW.subscribed_at, datetime('now')) WHERE id = NEW.id;
END;

CREATE TRIGGER trg_contacts_status_unsubscribed
AFTER UPDATE OF status ON contacts
WHEN NEW.status = 'unsubscribed'
BEGIN
  UPDATE contacts SET unsubscribed_at = COALESCE(NEW.unsubscribed_at, datetime('now')) WHERE id = NEW.id;
END;

-- LISTS ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  slug       TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lists_name ON lists(name);

-- LIST SUBSCRIPTIONS -----------------------------------------------------
CREATE TABLE IF NOT EXISTS list_subscriptions (
  list_id    INTEGER NOT NULL REFERENCES lists(id)    ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (list_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_list_sub_contact ON list_subscriptions(contact_id);

-- CONSENTS ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consents (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  purpose    TEXT    NOT NULL,                  -- es. 'booking_updates', 'newsletter', 'terms', 'privacy'
  granted_at TEXT    NOT NULL DEFAULT (datetime('now')),
  ip         TEXT,                              -- IP del consenso
  ua         TEXT,                              -- user-agent
  source     TEXT,                              -- es. 'landing', 'import'
  UNIQUE (contact_id, purpose, granted_at)
);
CREATE INDEX IF NOT EXISTS idx_consents_contact ON consents(contact_id);
CREATE INDEX IF NOT EXISTS idx_consents_purpose ON consents(purpose);

-- NOTE SULLA COLONNA bookings.contact_id ---------------------------------
-- Lo schema Bookings vive su un database separato (cms/db/bookings.sqlite).
-- Per collegare una prenotazione ad un contatto, eseguire UNA migrazione nel DB bookings,
-- non in questo file (per evitare errori su main.sqlite). Esempio da applicare su bookings.sqlite:
--
--   ALTER TABLE bookings ADD COLUMN contact_id INTEGER NULL;  -- FK logica verso main.contacts (cross-DB)
--
-- Il collegamento applicativo userà l'ID del contatto creato/aggiornato al momento della prenotazione.

COMMIT;