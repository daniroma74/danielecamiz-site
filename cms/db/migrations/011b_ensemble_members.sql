BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- ensure default ensemble exists
INSERT INTO ensembles (name, slug)
SELECT 'Orchestra ICNT', 'orchestra-icnt'
WHERE NOT EXISTS (
  SELECT 1 FROM ensembles WHERE slug = 'orchestra-icnt'
);

-- ensemble members (internal roster)
CREATE TABLE IF NOT EXISTS ensemble_members (
  ensemble_id INTEGER NOT NULL,
  artist_id   INTEGER NOT NULL,
  instrument  TEXT,
  section     TEXT,
  chair       INTEGER CHECK (chair IS NULL OR chair >= 1),
  role        TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at  DATETIME,
  PRIMARY KEY (ensemble_id, artist_id),
  FOREIGN KEY (ensemble_id) REFERENCES ensembles(id) ON DELETE CASCADE,
  FOREIGN KEY (artist_id)  REFERENCES artists(id)   ON DELETE CASCADE
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_ensemble_members_ensemble_active
  ON ensemble_members (ensemble_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ensemble_members_artist
  ON ensemble_members (artist_id);
CREATE INDEX IF NOT EXISTS idx_ensemble_members_section_instrument_active
  ON ensemble_members (section, instrument, is_active);
CREATE INDEX IF NOT EXISTS idx_ensemble_members_ensemble_section
  ON ensemble_members (ensemble_id, section);

-- updated_at maintenance
CREATE TRIGGER IF NOT EXISTS trg_ensemble_members_updated_at
AFTER UPDATE ON ensemble_members
FOR EACH ROW
BEGIN
  UPDATE ensemble_members
    SET updated_at = CURRENT_TIMESTAMP
    WHERE ensemble_id = OLD.ensemble_id AND artist_id = OLD.artist_id;
END;

COMMIT;