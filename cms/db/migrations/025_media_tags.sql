

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- Tags per media assets
CREATE TABLE IF NOT EXISTS media_tags (
  id         INTEGER PRIMARY KEY,
  tag        TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS media_asset_tags (
  asset_id   INTEGER NOT NULL,
  tag_id     INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (asset_id, tag_id),
  FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)   REFERENCES media_tags(id)   ON DELETE CASCADE
);

-- Indici di servizio
CREATE INDEX IF NOT EXISTS idx_media_asset_tags_tag   ON media_asset_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_media_asset_tags_asset ON media_asset_tags(asset_id);

-- updated_at maintenance
CREATE TRIGGER IF NOT EXISTS trg_media_tags_updated_at
AFTER UPDATE ON media_tags
FOR EACH ROW
BEGIN
  UPDATE media_tags SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

COMMIT;