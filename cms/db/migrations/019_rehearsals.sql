

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- Rehearsals (prove) per evento
CREATE TABLE IF NOT EXISTS rehearsals (
  id         INTEGER PRIMARY KEY,
  event_id   INTEGER NOT NULL,
  starts_at  DATETIME NOT NULL,
  ends_at    DATETIME,
  location   TEXT,
  kind       TEXT CHECK(kind IN ('tutti','sectional','dress','soundcheck','other')),
  notes      TEXT,
  created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at DATETIME,
  FOREIGN KEY (event_id) REFERENCES concerts(id) ON DELETE CASCADE,
  CHECK (ends_at IS NULL OR datetime(ends_at) >= datetime(starts_at))
);

CREATE INDEX IF NOT EXISTS idx_rehearsals_event_id ON rehearsals(event_id);
CREATE INDEX IF NOT EXISTS idx_rehearsals_start ON rehearsals(starts_at);

-- Presenze alle prove (interno)
CREATE TABLE IF NOT EXISTS rehearsal_attendance (
  rehearsal_id   INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  attended       INTEGER NOT NULL DEFAULT 1 CHECK (attended IN (0,1)),
  hours          REAL DEFAULT 0 CHECK (hours >= 0),
  notes          TEXT,
  created_at     DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at     DATETIME,
  PRIMARY KEY (rehearsal_id, participant_id),
  FOREIGN KEY (rehearsal_id)   REFERENCES rehearsals(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES artists(id)   ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rehearsal_attendance_rehearsal   ON rehearsal_attendance(rehearsal_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_attendance_participant ON rehearsal_attendance(participant_id);

-- updated_at triggers
CREATE TRIGGER IF NOT EXISTS trg_rehearsals_updated_at
AFTER UPDATE ON rehearsals
FOR EACH ROW
BEGIN
  UPDATE rehearsals SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_rehearsal_attendance_updated_at
AFTER UPDATE ON rehearsal_attendance
FOR EACH ROW
BEGIN
  UPDATE rehearsal_attendance
    SET updated_at = CURRENT_TIMESTAMP
    WHERE rehearsal_id = OLD.rehearsal_id AND participant_id = OLD.participant_id;
END;

COMMIT;