-- main.sql — Database unificato Concerti + Repertorio (SQLite)
-- Minimal comments, schema autosufficiente.

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- Versioning (opzionale, per future migrazioni)
CREATE TABLE IF NOT EXISTS schema_version (
  id            INTEGER PRIMARY KEY,
  version       INTEGER NOT NULL,
  applied_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- === Anagrafica compositori ===
CREATE TABLE IF NOT EXISTS composers (
  id            INTEGER PRIMARY KEY,
  slug          TEXT    UNIQUE,                       -- "wolfgang-amadeus-mozart"
  full_name     TEXT    NOT NULL,                     -- "Wolfgang Amadeus Mozart"
  short_name    TEXT,                                 -- "Mozart"
  sort_key      TEXT                                  -- "Mozart, Wolfgang Amadeus"
);

CREATE INDEX IF NOT EXISTS idx_composers_sort_key ON composers (sort_key);
CREATE INDEX IF NOT EXISTS idx_composers_full_name ON composers (full_name);

-- === Categorie repertorio ===
CREATE TABLE IF NOT EXISTS categories (
  id            INTEGER PRIMARY KEY,
  slug          TEXT    NOT NULL UNIQUE,              -- "sinfonie", "ouverture", "concerti", "suite", "vocale", "altri-generi"
  label_it      TEXT,                                 -- etichetta IT per UI
  label_en      TEXT,                                 -- etichetta EN per UI
  position      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_categories_position ON categories (position);

-- === Brani (repertorio) ===
CREATE TABLE IF NOT EXISTS works (
  id               INTEGER PRIMARY KEY,
  composer_id      INTEGER NOT NULL REFERENCES composers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  category_id      INTEGER NOT NULL REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  title            TEXT    NOT NULL,                  -- "Sinfonia n. 40 in sol minore, K. 550"
  subtitle         TEXT,                              -- eventuale sottotitolo
  catalogue        TEXT,                              -- "K. 550", "Op. 73"...
  work_key         TEXT,                              -- tonalità (es. "sol minore")
  year             INTEGER,                           -- anno composizione (se noto)
  notes_it         TEXT,                              -- opzionale
  notes_en         TEXT,                              -- opzionale
  media_video      TEXT,                              -- URL YouTube/Vimeo
  media_audio      TEXT,                              -- URL SoundCloud/Bandcamp
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_works_composer    ON works (composer_id);
CREATE INDEX IF NOT EXISTS idx_works_category    ON works (category_id);
CREATE INDEX IF NOT EXISTS idx_works_title       ON works (title);

-- === Concerti ===
CREATE TABLE IF NOT EXISTS concerts (
  id                    INTEGER PRIMARY KEY,
  title                 TEXT,                          -- titolo evento (opzionale)
  date                  TEXT    NOT NULL,              -- ISO YYYY-MM-DD
  location              TEXT,
  poster_cloudinary_id  TEXT,                          -- preferito (source of truth)
  poster_local_filename TEXT,                          -- fallback locale per futuri
  is_future             INTEGER NOT NULL DEFAULT 0,    -- 1 se futuro
  program_notes         TEXT,                          -- note di programma (opzionale)
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_concerts_date      ON concerts (date);
CREATE INDEX IF NOT EXISTS idx_concerts_is_future ON concerts (is_future);

-- === Programma concerto (N:N) ===
CREATE TABLE IF NOT EXISTS concert_program (
  id            INTEGER PRIMARY KEY,
  concert_id    INTEGER NOT NULL REFERENCES concerts(id) ON UPDATE CASCADE ON DELETE CASCADE,
  work_id       INTEGER NOT NULL REFERENCES works(id)    ON UPDATE CASCADE ON DELETE RESTRICT,
  position      INTEGER,                          -- ordine in programma
  first_time    INTEGER NOT NULL DEFAULT 0,       -- 1 se prima esecuzione
  notes         TEXT
);

-- Un concerto non dovrebbe avere due brani nella stessa posizione
CREATE UNIQUE INDEX IF NOT EXISTS ux_concert_program_unique_pos ON concert_program (concert_id, position);
CREATE INDEX IF NOT EXISTS idx_concert_program_work    ON concert_program (work_id);
CREATE INDEX IF NOT EXISTS idx_concert_program_concert ON concert_program (concert_id);

-- === Trigger updated_at ===
CREATE TRIGGER IF NOT EXISTS trg_works_updated_at
AFTER UPDATE ON works
FOR EACH ROW BEGIN
  UPDATE works SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_concerts_updated_at
AFTER UPDATE ON concerts
FOR EACH ROW BEGIN
  UPDATE concerts SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- === Visite utili ===

-- Brani con conteggio esecuzioni
CREATE VIEW IF NOT EXISTS view_works_with_counts AS
SELECT
  w.*,
  COALESCE(COUNT(cp.id), 0) AS executions_count
FROM works w
LEFT JOIN concert_program cp ON cp.work_id = w.id
GROUP BY w.id;

-- Concerti "upcoming": flag is_future oppure data >= oggi
CREATE VIEW IF NOT EXISTS view_upcoming_concerts AS
SELECT *
FROM concerts
WHERE is_future = 1
   OR date(date) >= date('now')
ORDER BY date ASC, id ASC;

-- Programma esteso con dettagli
CREATE VIEW IF NOT EXISTS view_concert_program_detailed AS
SELECT
  cp.id,
  cp.concert_id,
  cp.work_id,
  cp.position,
  cp.first_time,
  c.title       AS concert_title,
  c.date        AS concert_date,
  c.location    AS concert_location,
  w.title       AS work_title,
  w.catalogue   AS work_catalogue,
  w.work_key    AS work_key,
  comp.full_name AS composer_full_name,
  cat.slug      AS category_slug
FROM concert_program cp
JOIN concerts   c   ON c.id = cp.concert_id
JOIN works      w   ON w.id = cp.work_id
JOIN composers  comp ON comp.id = w.composer_id
JOIN categories cat  ON cat.id = w.category_id
ORDER BY c.date ASC, cp.position ASC;

-- === Dettagli personale concerto (normalizzazione) ===
CREATE TABLE IF NOT EXISTS concert_performers (
  id          INTEGER PRIMARY KEY,
  concert_id  INTEGER NOT NULL REFERENCES concerts(id) ON UPDATE CASCADE ON DELETE CASCADE,
  role        TEXT    NOT NULL CHECK(role IN ('orchestra','conductor','soloist')),
  name        TEXT    NOT NULL,
  instrument  TEXT                                    -- strumento per i solisti (es. "violino")
);

CREATE INDEX IF NOT EXISTS idx_concert_performers_concert ON concert_performers (concert_id);
CREATE INDEX IF NOT EXISTS idx_concert_performers_role    ON concert_performers (role);
CREATE UNIQUE INDEX IF NOT EXISTS ux_concert_performers_unique ON concert_performers(concert_id, role, name, COALESCE(instrument,''));

-- === Metadati extra concerto (note, youtube, ecc.) ===
CREATE TABLE IF NOT EXISTS concert_extra (
  concert_id  INTEGER PRIMARY KEY REFERENCES concerts(id) ON UPDATE CASCADE ON DELETE CASCADE,
  notes       TEXT,
  youtube_url TEXT
);

-- === Vista aggregata personale (1 riga per concerto) ===
CREATE VIEW IF NOT EXISTS view_concert_personnel_agg AS
SELECT
  concert_id,
  MAX(CASE WHEN role='orchestra' THEN name END) AS orchestra,
  MAX(CASE WHEN role='conductor' THEN name END) AS conductor,
  TRIM(
    REPLACE(
      COALESCE(
        (
          SELECT GROUP_CONCAT(
                   CASE 
                     WHEN (s.instrument IS NULL OR s.instrument='') THEN s.name
                     ELSE s.name || ', ' || s.instrument
                   END, ' · ')
          FROM concert_performers s
          WHERE s.concert_id = p.concert_id AND s.role = 'soloist'
        ), ''
      ), ' ·  · ', ' · '
    )
  ) AS soloists
FROM concert_performers p
GROUP BY concert_id;

-- === Seed categorie comuni (idempotente) ===
INSERT OR IGNORE INTO categories (slug, label_it, label_en, position) VALUES
  ('sinfonie',     'Sinfonie',     'Symphonies',  1),
  ('ouverture',    'Ouverture',    'Overtures',   2),
  ('concerti',     'Concerti',     'Concertos',   3),
  ('suite',        'Suite',        'Suites',      4),
  ('vocale',       'Vocale',       'Vocal',       5),
  ('altri-generi', 'Altri generi', 'Other',       9);

-- Segna la versione schema
INSERT INTO schema_version (version) VALUES (1);
INSERT INTO schema_version (version) VALUES (2);
INSERT INTO schema_version (version) VALUES (3);

COMMIT;