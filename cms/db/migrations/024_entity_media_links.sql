

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- Links tra entità (eventi/post/press/video/pagine) e media assets
CREATE TABLE IF NOT EXISTS entity_media_links (
  entity_type TEXT NOT NULL CHECK(entity_type IN ('event','post','press','video','page')),
  entity_id   INTEGER NOT NULL,
  role        TEXT NOT NULL CHECK(role IN ('poster','gallery','cover','thumb','ui')),
  asset_id    INTEGER NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at  DATETIME,
  PRIMARY KEY (entity_type, entity_id, role, asset_id),
  FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE CASCADE
);

-- Indici operativi
CREATE INDEX IF NOT EXISTS idx_eml_entity_role_order ON entity_media_links(entity_type, entity_id, role, sort_order);
CREATE INDEX IF NOT EXISTS idx_eml_asset              ON entity_media_links(asset_id);

-- Vincoli di unicità per ruoli singoli (poster/cover/thumb) a livello di entità
CREATE UNIQUE INDEX IF NOT EXISTS idx_eml_single_poster ON entity_media_links(entity_type, entity_id, role)
  WHERE role = 'poster';
CREATE UNIQUE INDEX IF NOT EXISTS idx_eml_single_cover ON entity_media_links(entity_type, entity_id, role)
  WHERE role = 'cover';
CREATE UNIQUE INDEX IF NOT EXISTS idx_eml_single_thumb ON entity_media_links(entity_type, entity_id, role)
  WHERE role = 'thumb';

-- updated_at maintenance
CREATE TRIGGER IF NOT EXISTS trg_entity_media_links_updated_at
AFTER UPDATE ON entity_media_links
FOR EACH ROW
BEGIN
  UPDATE entity_media_links
    SET updated_at = CURRENT_TIMESTAMP
    WHERE entity_type = OLD.entity_type
      AND entity_id   = OLD.entity_id
      AND role        = OLD.role
      AND asset_id    = OLD.asset_id;
END;

COMMIT;