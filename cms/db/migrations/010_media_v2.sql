

-- 010_media_v2.sql
-- Media v2: add category/canonical_url + constraints via triggers + indexes
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Columns
ALTER TABLE media_assets ADD COLUMN category TEXT;           -- poster|gallery|press|ui|news_cover|video_thumbnail|other (libero)
ALTER TABLE media_assets ADD COLUMN canonical_url TEXT;      -- URL pubblico canonico (opz.)

-- Triggers to enforce storage/path/cloudinary_id coherence
DROP TRIGGER IF EXISTS trg_media_assets_storage_check_ins;
DROP TRIGGER IF EXISTS trg_media_assets_storage_check_upd;

CREATE TRIGGER trg_media_assets_storage_check_ins
BEFORE INSERT ON media_assets
BEGIN
  SELECT CASE
    WHEN NEW.storage NOT IN ('local','cloudinary')
      THEN RAISE(ABORT, 'media_assets.storage must be local|cloudinary')
    WHEN NEW.storage = 'cloudinary' AND (NEW.cloudinary_id IS NULL OR length(trim(NEW.cloudinary_id)) = 0)
      THEN RAISE(ABORT, 'media_assets.cloudinary_id required when storage=cloudinary')
    WHEN NEW.storage = 'local' AND (NEW.path IS NULL OR length(trim(NEW.path)) = 0)
      THEN RAISE(ABORT, 'media_assets.path required when storage=local')
  END;
END;

CREATE TRIGGER trg_media_assets_storage_check_upd
BEFORE UPDATE ON media_assets
BEGIN
  SELECT CASE
    WHEN NEW.storage NOT IN ('local','cloudinary')
      THEN RAISE(ABORT, 'media_assets.storage must be local|cloudinary')
    WHEN NEW.storage = 'cloudinary' AND (NEW.cloudinary_id IS NULL OR length(trim(NEW.cloudinary_id)) = 0)
      THEN RAISE(ABORT, 'media_assets.cloudinary_id required when storage=cloudinary')
    WHEN NEW.storage = 'local' AND (NEW.path IS NULL OR length(trim(NEW.path)) = 0)
      THEN RAISE(ABORT, 'media_assets.path required when storage=local')
  END;
END;

-- Helpful indexes (partial where applicable)
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_assets_storage ON media_assets(storage);
CREATE INDEX IF NOT EXISTS idx_media_assets_cloudinary_id ON media_assets(cloudinary_id) WHERE cloudinary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_path ON media_assets(path) WHERE path IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_media_assets_cloudinary_id ON media_assets(cloudinary_id) WHERE storage = 'cloudinary';
CREATE UNIQUE INDEX IF NOT EXISTS uidx_media_assets_path ON media_assets(path) WHERE storage = 'local';

COMMIT;