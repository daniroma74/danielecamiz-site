

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- Base table for media assets (prerequisite for 010_media_v2.sql)
CREATE TABLE IF NOT EXISTS media_assets (
  id           INTEGER PRIMARY KEY,
  storage      TEXT NOT NULL CHECK (storage IN ('local','cloudinary')),
  path         TEXT,               -- for local storage
  cloudinary_id TEXT,              -- for cloudinary storage (public_id)
  alt          TEXT,               -- optional alt/description
  credits      TEXT,               -- optional credits/author
  width        INTEGER,            -- optional intrinsic width
  height       INTEGER,            -- optional intrinsic height
  mime_type    TEXT,               -- optional mime type
  created_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at   DATETIME
);

-- lightweight indexes (010 will add more specific ones)
CREATE INDEX IF NOT EXISTS idx_media_assets_storage ON media_assets(storage);

-- updated_at maintenance
CREATE TRIGGER IF NOT EXISTS trg_media_assets_updated_at
AFTER UPDATE ON media_assets
FOR EACH ROW
BEGIN
  UPDATE media_assets SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

COMMIT;