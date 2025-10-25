

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- 029_extend_ensemble_members.sql
-- Scopo: estendere la tabella ensemble_members con colonne per strumento/sedia/stato/note
-- Nota: idempotenza non garantita su ADD COLUMN (SQLite non supporta IF NOT EXISTS su colonne).
-- Eseguire una sola volta.

-- Nuove colonne (se non già presenti):
ALTER TABLE ensemble_members
  ADD COLUMN instrument_id INTEGER REFERENCES instruments(id) ON DELETE SET NULL;

ALTER TABLE ensemble_members
  ADD COLUMN chair INTEGER CHECK (chair IS NULL OR chair >= 1);

ALTER TABLE ensemble_members
  ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1));

ALTER TABLE ensemble_members
  ADD COLUMN notes TEXT;

-- Indici di supporto
CREATE INDEX IF NOT EXISTS idx_ensemble_members_ensemble
  ON ensemble_members(ensemble_id);

CREATE INDEX IF NOT EXISTS idx_ensemble_members_artist
  ON ensemble_members(artist_id);

CREATE INDEX IF NOT EXISTS idx_ensemble_members_instrument
  ON ensemble_members(instrument_id);

COMMIT;