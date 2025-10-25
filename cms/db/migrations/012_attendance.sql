

-- 012_attendance.sql
-- Presenze ICNT: ensemble_members + event_attendance
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- ENSEMBLE MEMBERS --------------------------------------------------------
-- Mappa la membership degli artisti negli ensemble (es. Orchestra ICNT)
CREATE TABLE IF NOT EXISTS ensemble_members (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ensemble_id INTEGER NOT NULL REFERENCES ensembles(id) ON DELETE CASCADE,
  artist_id   INTEGER NOT NULL REFERENCES artists(id)   ON DELETE CASCADE,
  role        TEXT,                            -- es. Violino I, Viola, Oboe, Direttore assistente
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  notes       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ensemble_id, artist_id)
);
CREATE INDEX IF NOT EXISTS idx_ensemble_members_ensemble ON ensemble_members(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_ensemble_members_artist   ON ensemble_members(artist_id);
CREATE INDEX IF NOT EXISTS idx_ensemble_members_active   ON ensemble_members(is_active);

-- EVENT ATTENDANCE --------------------------------------------------------
-- Presenze per evento dei partecipanti ICNT (collega a ARTISTS)
CREATE TABLE IF NOT EXISTS event_attendance (
  event_id       INTEGER NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES artists(id)  ON DELETE RESTRICT,
  attended       INTEGER NOT NULL DEFAULT 1 CHECK (attended IN (0,1)),
  hours          REAL    NOT NULL DEFAULT 0,
  notes          TEXT,
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, participant_id)
);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event       ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_participant ON event_attendance(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_attended    ON event_attendance(attended);

-- Trigger per updated_at
DROP TRIGGER IF EXISTS trg_event_attendance_updated_at_ins;
DROP TRIGGER IF EXISTS trg_event_attendance_updated_at_upd;

CREATE TRIGGER trg_event_attendance_updated_at_ins
AFTER INSERT ON event_attendance
BEGIN
  UPDATE event_attendance
     SET updated_at = datetime('now')
   WHERE event_id = NEW.event_id AND participant_id = NEW.participant_id;
END;

CREATE TRIGGER trg_event_attendance_updated_at_upd
AFTER UPDATE ON event_attendance
BEGIN
  UPDATE event_attendance
     SET updated_at = datetime('now')
   WHERE event_id = NEW.event_id AND participant_id = NEW.participant_id;
END;

COMMIT;