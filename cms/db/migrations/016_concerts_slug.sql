BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- 016_concerts_slug.sql
-- Scopo: aggiunge colonna `slug` alla tabella `concerts`,
--        effettua un backfill ragionevole e impone unicità.

-- 1) Aggiungi colonna (ammessa NULL per backfill graduale)
ALTER TABLE concerts ADD COLUMN slug TEXT;

-- 2) Backfill iniziale: slug da (YYYY-MM-DD)-(title) se possibile, altrimenti da title
--    NB: rimozione caratteri rumorosi e sostituzione spazi con '-'
UPDATE concerts
SET slug = lower(
  replace(replace(replace(replace(replace(replace(
  replace(replace(replace(replace(replace(replace(
    trim(
      COALESCE(
        (CASE
          WHEN date IS NOT NULL AND length(trim(date)) > 0 THEN
            COALESCE(strftime('%Y-%m-%d', date), trim(date)) || '-' || COALESCE(trim(title),'')
          ELSE COALESCE(trim(title),'')
        END),
        printf('event-%d', COALESCE(id, rowid))
      )
    ), ' ', '-'),
    '''',''), '"',''), ',', ''), '.', ''), '/', '-'), '\\','-'),
    ':','-'), ';','-'), '&','-'), '(' , ''), ')' , '')
)
WHERE slug IS NULL OR slug = '';

-- 3) Normalizzazione semplice dei doppi trattini (ripetuta per coprire sequenze lunghe)
UPDATE concerts SET slug = replace(slug, '--', '-') WHERE instr(slug, '--') > 0;
UPDATE concerts SET slug = replace(slug, '--', '-') WHERE instr(slug, '--') > 0;
UPDATE concerts SET slug = replace(slug, '--', '-') WHERE instr(slug, '--') > 0;

-- 4) De-duplicazione: mantieni il primo rowid per ogni slug, gli altri appendono il rowid
UPDATE concerts
SET slug = slug || '-' || rowid
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM concerts WHERE slug IS NOT NULL AND slug <> '' GROUP BY slug
)
AND slug IS NOT NULL AND slug <> '';

-- 5) Fallback finale per eventuali valori mancanti
UPDATE concerts
SET slug = printf('event-%d', COALESCE(id, rowid))
WHERE slug IS NULL OR slug = '';

-- 6) Vincolo di unicità sull'attributo slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_concerts_slug_unique ON concerts(slug);

COMMIT;
