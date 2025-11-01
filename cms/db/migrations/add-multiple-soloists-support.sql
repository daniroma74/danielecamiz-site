-- Migration: Add support for multiple soloists per program item
-- Date: 2025-10-30
-- Problem: Concert program can only have one soloist per work, but we need to support multiple (e.g., soprano + tenor for a duet)

-- Step 1: Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS concert_program_soloists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_item_id INTEGER NOT NULL,
  performer_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (program_item_id) REFERENCES concert_program(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (performer_id) REFERENCES concert_performers(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE(program_item_id, performer_id)
);

CREATE INDEX idx_program_soloists_program ON concert_program_soloists(program_item_id);
CREATE INDEX idx_program_soloists_performer ON concert_program_soloists(performer_id);

-- Step 2: Migrate existing data from soloist_id column to new table
INSERT INTO concert_program_soloists (program_item_id, performer_id)
SELECT cp.id, cp.soloist_id
FROM concert_program cp
WHERE cp.soloist_id IS NOT NULL;

-- Note: We keep the soloist_id column for backward compatibility
-- It can be removed in a future migration after confirming everything works

-- Verification queries:
-- SELECT * FROM concert_program_soloists LIMIT 10;
-- SELECT COUNT(*) FROM concert_program_soloists;
