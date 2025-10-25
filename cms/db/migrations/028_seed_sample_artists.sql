

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- Sample artists (idempotente) per test Presenze/Lineup.
-- Usa INSERT ... SELECT ... WHERE NOT EXISTS per evitare duplicati anche senza UNIQUE su artists.name
INSERT INTO artists(name, role_default, links_json, bio_short)
SELECT 'Giulia Rossi', 'violin', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name='Giulia Rossi');

INSERT INTO artists(name, role_default, links_json, bio_short)
SELECT 'Marco Bianchi', 'viola', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name='Marco Bianchi');

INSERT INTO artists(name, role_default, links_json, bio_short)
SELECT 'Sara Verdi', 'oboe', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name='Sara Verdi');

INSERT INTO artists(name, role_default, links_json, bio_short)
SELECT 'Luca Neri', 'trumpet', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name='Luca Neri');

INSERT INTO artists(name, role_default, links_json, bio_short)
SELECT 'Anna Blu', 'percussion', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name='Anna Blu');

-- Ensemble members su Orchestra ICNT (richiede 027_seed_ensemble_icnt + 026_seed_instruments)
-- Colonne attese: ensemble_members(ensemble_id, artist_id, role, instrument_id, chair, is_active, notes)

-- Giulia Rossi – Violino I (spalla=chair 1)
INSERT INTO ensemble_members(ensemble_id, artist_id, role, instrument_id, chair, is_active, notes)
SELECT e.id, a.id, 'Violino I', i.id, 1, 1, NULL
FROM ensembles e, artists a, instruments i
WHERE e.slug='orchestra-icnt' AND a.name='Giulia Rossi' AND i.code='vln1'
  AND NOT EXISTS (
    SELECT 1 FROM ensemble_members em
    WHERE em.ensemble_id=e.id AND em.artist_id=a.id
  );

-- Marco Bianchi – Viola (chair 3 come esempio)
INSERT INTO ensemble_members(ensemble_id, artist_id, role, instrument_id, chair, is_active, notes)
SELECT e.id, a.id, 'Viola', i.id, 3, 1, NULL
FROM ensembles e, artists a, instruments i
WHERE e.slug='orchestra-icnt' AND a.name='Marco Bianchi' AND i.code='vla'
  AND NOT EXISTS (
    SELECT 1 FROM ensemble_members em
    WHERE em.ensemble_id=e.id AND em.artist_id=a.id
  );

-- Sara Verdi – Oboe (principal)
INSERT INTO ensemble_members(ensemble_id, artist_id, role, instrument_id, chair, is_active, notes)
SELECT e.id, a.id, 'Oboe', i.id, 1, 1, NULL
FROM ensembles e, artists a, instruments i
WHERE e.slug='orchestra-icnt' AND a.name='Sara Verdi' AND i.code='ob'
  AND NOT EXISTS (
    SELECT 1 FROM ensemble_members em
    WHERE em.ensemble_id=e.id AND em.artist_id=a.id
  );

-- Luca Neri – Tromba (principal)
INSERT INTO ensemble_members(ensemble_id, artist_id, role, instrument_id, chair, is_active, notes)
SELECT e.id, a.id, 'Tromba', i.id, 1, 1, NULL
FROM ensembles e, artists a, instruments i
WHERE e.slug='orchestra-icnt' AND a.name='Luca Neri' AND i.code='tpt'
  AND NOT EXISTS (
    SELECT 1 FROM ensemble_members em
    WHERE em.ensemble_id=e.id AND em.artist_id=a.id
  );

-- Anna Blu – Percussioni
INSERT INTO ensemble_members(ensemble_id, artist_id, role, instrument_id, chair, is_active, notes)
SELECT e.id, a.id, 'Percussioni', i.id, NULL, 1, NULL
FROM ensembles e, artists a, instruments i
WHERE e.slug='orchestra-icnt' AND a.name='Anna Blu' AND i.code='perc'
  AND NOT EXISTS (
    SELECT 1 FROM ensemble_members em
    WHERE em.ensemble_id=e.id AND em.artist_id=a.id
  );

COMMIT;