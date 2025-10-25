

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- ============================
-- Repertory (works/parts) + Event program
-- ============================

-- Works (opera madre)
CREATE TABLE IF NOT EXISTS repertory_works (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  composer_name TEXT NOT NULL,
  title         TEXT NOT NULL,
  catalog_no    TEXT,
  key_signature TEXT,
  year          INTEGER,
  duration_min  REAL,
  created_at    DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at    DATETIME
);

CREATE INDEX IF NOT EXISTS idx_repertory_works_composer_title
  ON repertory_works (composer_name, title);

-- Parts (movimenti/arie/estratti)
CREATE TABLE IF NOT EXISTS repertory_parts (
  id           INTEGER PRIMARY KEY,
  work_id      INTEGER NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 1,
  part_type    TEXT CHECK(part_type IN ('movement','aria','scene','excerpt','other')),
  number_label TEXT,
  title        TEXT NOT NULL,
  aka          TEXT,
  duration_min REAL,
  created_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at   DATETIME,
  FOREIGN KEY (work_id) REFERENCES repertory_works(id) ON DELETE CASCADE,
  UNIQUE (work_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_repertory_parts_work
  ON repertory_parts (work_id);

-- Programma eventi (cosa si suona in quel concerto)
CREATE TABLE IF NOT EXISTS event_program_items (
  id          INTEGER PRIMARY KEY,
  event_id    INTEGER NOT NULL,
  work_id     INTEGER,
  scope       TEXT NOT NULL CHECK(scope IN ('work','parts','custom')),
  custom_title TEXT,
  notes       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at  DATETIME,
  FOREIGN KEY (event_id) REFERENCES concerts(id) ON DELETE CASCADE,
  FOREIGN KEY (work_id)  REFERENCES repertory_works(id) ON DELETE SET NULL,
  UNIQUE (event_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_event_program_items_event
  ON event_program_items (event_id);

-- Parti collegate a un item di programma (quando scope='parts')
CREATE TABLE IF NOT EXISTS event_program_item_parts (
  program_item_id INTEGER NOT NULL,
  part_id         INTEGER NOT NULL,
  PRIMARY KEY (program_item_id, part_id),
  FOREIGN KEY (program_item_id) REFERENCES event_program_items(id) ON DELETE CASCADE,
  FOREIGN KEY (part_id)         REFERENCES repertory_parts(id)        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_program_item_parts_part
  ON event_program_item_parts (part_id);

-- updated_at triggers
CREATE TRIGGER IF NOT EXISTS trg_repertory_works_updated_at
AFTER UPDATE ON repertory_works
FOR EACH ROW
BEGIN
  UPDATE repertory_works SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_repertory_parts_updated_at
AFTER UPDATE ON repertory_parts
FOR EACH ROW
BEGIN
  UPDATE repertory_parts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_event_program_items_updated_at
AFTER UPDATE ON event_program_items
FOR EACH ROW
BEGIN
  UPDATE event_program_items SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

COMMIT;