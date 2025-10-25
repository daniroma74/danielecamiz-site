-- migrations/001_add_movements.sql
-- Aggiunge supporto per movimenti separati dei brani

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- Tabella movimenti (parti di un brano completo)
CREATE TABLE IF NOT EXISTS movements (
  id               INTEGER PRIMARY KEY,
  work_id          INTEGER NOT NULL REFERENCES works(id) ON UPDATE CASCADE ON DELETE CASCADE,
  movement_number  INTEGER NOT NULL,           -- 1, 2, 3, 4...
  title            TEXT,                       -- "Allegro", "Andante", etc.
  tempo            TEXT,                       -- "Allegro con brio", "Adagio"
  duration_minutes INTEGER,                    -- durata in minuti
  notes_it         TEXT,                       -- note specifiche movimento
  notes_en         TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  
  UNIQUE(work_id, movement_number)
);

CREATE INDEX IF NOT EXISTS idx_movements_work ON movements(work_id);
CREATE INDEX IF NOT EXISTS idx_movements_number ON movements(movement_number);

-- Trigger aggiornamento timestamp
CREATE TRIGGER IF NOT EXISTS trg_movements_updated_at
AFTER UPDATE ON movements
FOR EACH ROW BEGIN
  UPDATE movements SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Tabella junction per concerti (ora può riferirsi a brano intero o movimento specifico)
CREATE TABLE IF NOT EXISTS concert_program_items (
  id               INTEGER PRIMARY KEY,
  concert_id       INTEGER NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
  work_id          INTEGER REFERENCES works(id) ON DELETE CASCADE,
  movement_id      INTEGER REFERENCES movements(id) ON DELETE CASCADE,
  position         INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  
  -- Constraint: deve avere O work_id O movement_id (non entrambi)
  CHECK ((work_id IS NOT NULL AND movement_id IS NULL) OR 
         (work_id IS NULL AND movement_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_program_items_concert ON concert_program_items(concert_id);
CREATE INDEX IF NOT EXISTS idx_program_items_work ON concert_program_items(work_id);
CREATE INDEX IF NOT EXISTS idx_program_items_movement ON concert_program_items(movement_id);

COMMIT;