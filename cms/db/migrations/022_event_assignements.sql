BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- Event assignments: chi suona cosa (per evento), con leggio/ruoli
CREATE TABLE IF NOT EXISTS event_assignments (
  event_id        INTEGER NOT NULL,
  participant_id  INTEGER NOT NULL,  -- artists.id
  instrument_id   INTEGER NOT NULL,  -- instruments.id
  chair           INTEGER CHECK (chair IS NULL OR chair >= 1),  -- 1=spalla/leader, 2=concertino/secondo, ...
  is_spalla       INTEGER NOT NULL DEFAULT 0 CHECK (is_spalla IN (0,1)),
  is_concertino   INTEGER NOT NULL DEFAULT 0 CHECK (is_concertino IN (0,1)),
  is_principal    INTEGER NOT NULL DEFAULT 0 CHECK (is_principal IN (0,1)),
  role_note       TEXT,
  created_at      DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at      DATETIME,
  PRIMARY KEY (event_id, participant_id, instrument_id),
  FOREIGN KEY (event_id)       REFERENCES concerts(id)    ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES artists(id)     ON DELETE CASCADE,
  FOREIGN KEY (instrument_id)  REFERENCES instruments(id) ON DELETE RESTRICT
);

-- Un leggio per volta per ogni strumento (consente multipli NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_assignments_unique_chair
  ON event_assignments (event_id, instrument_id, chair);

-- Indici operativi
CREATE INDEX IF NOT EXISTS idx_event_assignments_event_instrument
  ON event_assignments (event_id, instrument_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_event_participant
  ON event_assignments (event_id, participant_id);

-- Vincoli logici (parziali) per ruoli: max 1 spalla, concertino, principal per strumento/evento
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_assignments_spalla_unique
  ON event_assignments (event_id, instrument_id)
  WHERE is_spalla = 1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_assignments_concertino_unique
  ON event_assignments (event_id, instrument_id)
  WHERE is_concertino = 1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_assignments_principal_unique
  ON event_assignments (event_id, instrument_id)
  WHERE is_principal = 1;

-- updated_at maintenance
CREATE TRIGGER IF NOT EXISTS trg_event_assignments_updated_at
AFTER UPDATE ON event_assignments
FOR EACH ROW
BEGIN
  UPDATE event_assignments
    SET updated_at = CURRENT_TIMESTAMP
    WHERE event_id = OLD.event_id AND participant_id = OLD.participant_id AND instrument_id = OLD.instrument_id;
END;

COMMIT;
