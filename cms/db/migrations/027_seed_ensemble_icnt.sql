

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- Seed ensemble di base per lineup/presenze (idempotente)
-- Crea "Orchestra ICNT" se non esiste ancora; aggiorna il nome se lo slug è presente.
INSERT OR IGNORE INTO ensembles (name, slug)
VALUES ('Orchestra ICNT', 'orchestra-icnt');

UPDATE ensembles
SET name = 'Orchestra ICNT'
WHERE slug = 'orchestra-icnt'
  AND (name IS NULL OR name <> 'Orchestra ICNT');

COMMIT;