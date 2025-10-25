

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- instruments catalog
CREATE TABLE IF NOT EXISTS instruments (
  id            INTEGER PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  family        TEXT NOT NULL CHECK(family IN ('strings','woodwinds','brass','percussion','keyboard','harp','other')),
  section       TEXT,
  name_it       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  doubling_of   INTEGER REFERENCES instruments(id) ON DELETE SET NULL,
  has_principal INTEGER NOT NULL DEFAULT 0 CHECK (has_principal IN (0,1)),
  created_at    DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at    DATETIME
);

CREATE INDEX IF NOT EXISTS idx_instruments_family_section ON instruments(family, section);
CREATE INDEX IF NOT EXISTS idx_instruments_doubling       ON instruments(doubling_of);

CREATE TRIGGER IF NOT EXISTS trg_instruments_updated_at
AFTER UPDATE ON instruments
FOR EACH ROW
BEGIN
  UPDATE instruments SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- seed
INSERT OR IGNORE INTO instruments (code, family, section, name_it, name_en, has_principal) VALUES
  -- archi
  ('strings-violin-1','strings','violini-primi','Violino I','Violin I',1),
  ('strings-violin-2','strings','violini-secondi','Violino II','Violin II',1),
  ('strings-viola','strings','viole','Viola','Viola',1),
  ('strings-cello','strings','violoncelli','Violoncello','Cello',1),
  ('strings-bass','strings','contrabbassi','Contrabbasso','Double Bass',1),
  -- legni
  ('flute','woodwinds','flauti','Flauto','Flute',1),
  ('piccolo','woodwinds','flauti','Ottavino','Piccolo',1),
  ('oboe','woodwinds','oboi','Oboe','Oboe',1),
  ('english-horn','woodwinds','oboi','Corno inglese','English Horn',1),
  ('clarinet','woodwinds','clarinetti','Clarinetto','Clarinet',1),
  ('bass-clarinet','woodwinds','clarinetti','Clarinetto basso','Bass Clarinet',1),
  ('bassoon','woodwinds','fagotti','Fagotto','Bassoon',1),
  ('contrabassoon','woodwinds','fagotti','Controfagotto','Contrabassoon',1),
  -- ottoni
  ('horn','brass','corni','Corno','Horn',1),
  ('trumpet','brass','trombe','Tromba','Trumpet',1),
  ('trombone','brass','tromboni','Trombone','Trombone',1),
  ('tuba','brass','tuba','Tuba','Tuba',0),
  -- arpa
  ('harp','harp','arpa','Arpa','Harp',0),
  -- percussioni
  ('timpani','percussion','timpani','Timpani','Timpani',0),
  ('percussion','percussion','percussioni','Percussioni','Percussion',0),
  -- tastiere
  ('piano','keyboard','pianoforte','Pianoforte','Piano',0),
  ('celesta','keyboard','celesta','Celesta','Celesta',0);

-- set doubling relationships
UPDATE instruments SET doubling_of = (SELECT id FROM instruments WHERE code = 'flute')          WHERE code = 'piccolo';
UPDATE instruments SET doubling_of = (SELECT id FROM instruments WHERE code = 'oboe')           WHERE code = 'english-horn';
UPDATE instruments SET doubling_of = (SELECT id FROM instruments WHERE code = 'clarinet')       WHERE code = 'bass-clarinet';
UPDATE instruments SET doubling_of = (SELECT id FROM instruments WHERE code = 'bassoon')        WHERE code = 'contrabassoon';

COMMIT;