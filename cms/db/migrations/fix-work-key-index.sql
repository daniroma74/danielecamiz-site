-- Migration: Fix work_key UNIQUE constraint issue
-- Date: 2025-10-30
-- Problem: work_key has UNIQUE index but contains old slugs, preventing new works from being added

-- Step 1: Drop the UNIQUE constraint on work_key
-- (Tonality can be the same for multiple works, so it doesn't need to be unique)
DROP INDEX IF EXISTS ux_works_work_key;

-- Step 2: Clean up existing data - set work_key to NULL for all works with slug-like values
-- (We identify slugs as values containing hyphens and being longer than 15 chars)
UPDATE works
SET work_key = NULL
WHERE work_key IS NOT NULL
  AND (LENGTH(work_key) > 15 OR work_key LIKE '%-%');

-- Step 3: Create a regular (non-unique) index on work_key for performance
CREATE INDEX IF NOT EXISTS idx_works_work_key ON works(work_key);

-- Verification queries (run these after migration to check):
-- SELECT COUNT(*) FROM works WHERE work_key IS NOT NULL; -- should show only real tonalities
-- SELECT id, title, work_key FROM works LIMIT 10; -- check the data
