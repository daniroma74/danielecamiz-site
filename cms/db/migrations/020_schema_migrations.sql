

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- Track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- Optional helper index for queries by time
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at
  ON schema_migrations(applied_at);

COMMIT;