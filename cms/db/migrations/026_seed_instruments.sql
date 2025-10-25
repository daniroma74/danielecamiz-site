

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- Seed canonico strumenti (idempotente). Non assume ID fissi; usa code UNIQUE.
-- STRINGS
INSERT OR IGNORE INTO instruments (code, family, section, name_it, name_en, has_principal) VALUES
  ('vln1','strings','violins1','Violino I','Violin I',1),
  ('vln2','strings','violins2','Violino II','Violin II',1),
  ('vla', 'strings','violas',  'Viola','Viola',1),
  ('vc',  'strings','cellos',  'Violoncello','Cello',1),
  ('cb',  'strings','basses',  'Contrabbasso','Double Bass',1);

-- WOODWINDS
INSERT OR IGNORE INTO instruments (code, family, section, name_it, name_en, has_principal) VALUES
  ('fl',  'woodwinds','flutes',    'Flauto','Flute',1),
  ('pic', 'woodwinds','flutes',    'Ottavino','Piccolo',1),
  ('ob',  'woodwinds','oboes',     'Oboe','Oboe',1),
  ('eh',  'woodwinds','oboes',     'Corno inglese','English Horn',1),
  ('cl',  'woodwinds','clarinets', 'Clarinetto','Clarinet',1),
  ('bcl', 'woodwinds','clarinets', 'Clarinetto basso','Bass Clarinet',1),
  ('bn',  'woodwinds','bassoons',  'Fagotto','Bassoon',1),
  ('cbn', 'woodwinds','bassoons',  'Controfagotto','Contrabassoon',1);

-- BRASS
INSERT OR IGNORE INTO instruments (code, family, section, name_it, name_en, has_principal) VALUES
  ('hn',  'brass','horns',      'Corno','Horn',1),
  ('tpt', 'brass','trumpets',   'Tromba','Trumpet',1),
  ('tbn', 'brass','trombones',  'Trombone','Trombone',1),
  ('tba', 'brass','tuba',       'Tuba','Tuba',0);

-- PERCUSSION
INSERT OR IGNORE INTO instruments (code, family, section, name_it, name_en, has_principal) VALUES
  ('timp','percussion','timpani','Timpani','Timpani',1),
  ('perc','percussion','percussion','Percussioni','Percussion',1);

-- KEYBOARD / HARP
INSERT OR IGNORE INTO instruments (code, family, section, name_it, name_en, has_principal) VALUES
  ('pf',  'keyboard','piano',   'Pianoforte','Piano',0),
  ('cel', 'keyboard','celesta', 'Celesta','Celesta',0),
  ('org', 'keyboard','organ',   'Organo','Organ',0),
  ('hp',  'harp',    'harp',    'Arpa','Harp',0);

-- Doubling (set dopo insert, no assunzione sugli ID)
UPDATE instruments SET doubling_of = (SELECT id FROM instruments WHERE code='fl')
 WHERE code='pic' AND doubling_of IS NULL;
UPDATE instruments SET doubling_of = (SELECT id FROM instruments WHERE code='ob')
 WHERE code='eh' AND doubling_of IS NULL;
UPDATE instruments SET doubling_of = (SELECT id FROM instruments WHERE code='cl')
 WHERE code='bcl' AND doubling_of IS NULL;
UPDATE instruments SET doubling_of = (SELECT id FROM instruments WHERE code='bn')
 WHERE code='cbn' AND doubling_of IS NULL;
UPDATE instruments SET doubling_of = (SELECT id FROM instruments WHERE code='pf')
 WHERE code='cel' AND doubling_of IS NULL;

COMMIT;