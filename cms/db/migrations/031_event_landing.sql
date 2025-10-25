

-- 031_event_landing.sql
-- Event landing content stored in DB (SQLite)

PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- 1) One-per-event landing meta
CREATE TABLE IF NOT EXISTS event_landings (
  event_id           INTEGER PRIMARY KEY,            -- FK → concerts.id (1:1)
  booking_enabled    INTEGER NOT NULL DEFAULT 0,     -- 0/1
  hero_asset_id      INTEGER NULL,                   -- optional → media_assets.id
  og_asset_id        INTEGER NULL,                   -- optional → media_assets.id
  created_at         TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL,
  FOREIGN KEY (event_id) REFERENCES concerts(id) ON DELETE CASCADE
);

-- Useful indexes (PK already indexes event_id)
CREATE INDEX IF NOT EXISTS idx_event_landings_booking ON event_landings (booking_enabled);

-- 2) Translated content per event (IT/EN ready)
CREATE TABLE IF NOT EXISTS event_landing_translations (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id             INTEGER NOT NULL,               -- FK → concerts.id
  lang                 TEXT    NOT NULL,               -- e.g., 'it', 'en'
  hero_title           TEXT    NULL,
  hero_subtitle        TEXT    NULL,
  body_html            TEXT    NULL,                   -- main rich text/HTML
  practical_info_html  TEXT    NULL,                   -- how to get there, timings, etc.
  cta_label            TEXT    NULL,
  cta_url              TEXT    NULL,
  seo_title            TEXT    NULL,
  seo_description      TEXT    NULL,
  created_at           TEXT    NOT NULL,
  updated_at           TEXT    NOT NULL,
  UNIQUE (event_id, lang),
  FOREIGN KEY (event_id) REFERENCES concerts(id) ON DELETE CASCADE
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_event_landing_tr_event ON event_landing_translations (event_id);
CREATE INDEX IF NOT EXISTS idx_event_landing_tr_lang  ON event_landing_translations (lang);

COMMIT;