

-- 011_lineup.sql
-- Lineup pubblico eventi: ensembles, artists, event_lineup
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- ENSEMBLES ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ensembles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ensembles_name ON ensembles(name);

-- ARTISTS -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artists (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,                 -- Nome e cognome o denominazione
  role_default TEXT,                              -- Esempio: "Direttore", "Violino", "Pianoforte"
  links_json   TEXT CHECK (links_json IS NULL OR json_valid(links_json)),
  bio_short    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_role_default ON artists(role_default);

-- EVENT_LINEUP ------------------------------------------------------------
-- Uno e uno solo tra ensemble_id e artist_id deve essere valorizzato a seconda di performer_type.
CREATE TABLE IF NOT EXISTS event_lineup (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id       INTEGER NOT NULL,                      -- FK → concerts.id
  performer_type TEXT    NOT NULL CHECK (performer_type IN ('ensemble','artist')),
  ensemble_id    INTEGER REFERENCES ensembles(id) ON DELETE SET NULL,
  artist_id      INTEGER REFERENCES artists(id)   ON DELETE SET NULL,
  role           TEXT,                                   -- ruolo mostrato in pubblico (es. Direttore, Solista)
  sort_order     INTEGER NOT NULL DEFAULT 0,             -- ordinamento all'interno dell'evento
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  
  -- Vincoli di coerenza tra performer_type e FK
  CHECK (
    (performer_type = 'ensemble' AND ensemble_id IS NOT NULL AND artist_id IS NULL) OR
    (performer_type = 'artist'   AND artist_id   IS NOT NULL AND ensemble_id IS NULL)
  ),
  
  -- Unicità ordinamento per tipo all'interno dell'evento
  UNIQUE (event_id, performer_type, sort_order),
  
  -- FK esplicita su concerts (ritardata: concerts già esiste nello schema principale)
  FOREIGN KEY (event_id) REFERENCES concerts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_lineup_event ON event_lineup(event_id);
CREATE INDEX IF NOT EXISTS idx_event_lineup_ensemble ON event_lineup(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_event_lineup_artist ON event_lineup(artist_id);
CREATE INDEX IF NOT EXISTS idx_event_lineup_type ON event_lineup(performer_type);
CREATE INDEX IF NOT EXISTS idx_event_lineup_role ON event_lineup(role);

-- SEED di base (facoltativo, idempotente): Orchestra ICNT
INSERT OR IGNORE INTO ensembles (name, slug) VALUES ('Orchestra ICNT','orchestra-icnt');

COMMIT;