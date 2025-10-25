

-- 014_videos.sql
-- Video: struttura base + i18n + capitoli
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- VIDEOS ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,
  platform      TEXT    NOT NULL CHECK (platform IN ('youtube','vimeo','file','other')),
  external_id   TEXT,                        -- YouTube/Vimeo id o URL per 'other'
  event_id      INTEGER REFERENCES concerts(id)     ON DELETE SET NULL,
  thumbnail_id  INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,
  status        TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','private','unlisted','published','archived')),
  published_at  TEXT,                        -- ISO YYYY-MM-DD HH:MM:SS
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK ((platform IN ('youtube','vimeo') AND external_id IS NOT NULL) OR (platform IN ('file','other')))
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_videos_platform_external_id ON videos(platform, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_event        ON videos(event_id);
CREATE INDEX IF NOT EXISTS idx_videos_status       ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at);
CREATE INDEX IF NOT EXISTS idx_videos_thumbnail    ON videos(thumbnail_id);

-- updated_at triggers for videos
DROP TRIGGER IF EXISTS trg_videos_updated_at_ins;
DROP TRIGGER IF EXISTS trg_videos_updated_at_upd;

CREATE TRIGGER trg_videos_updated_at_ins
AFTER INSERT ON videos
BEGIN
  UPDATE videos SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_videos_updated_at_upd
AFTER UPDATE ON videos
BEGIN
  UPDATE videos SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- VIDEOS I18N -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos_i18n (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id       INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  lang           TEXT    NOT NULL CHECK (lang IN ('it','en')),
  title          TEXT    NOT NULL,
  description_md TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (video_id, lang)
);

CREATE INDEX IF NOT EXISTS idx_videos_i18n_video ON videos_i18n(video_id);
CREATE INDEX IF NOT EXISTS idx_videos_i18n_lang  ON videos_i18n(lang);

DROP TRIGGER IF EXISTS trg_videos_i18n_updated_at_ins;
DROP TRIGGER IF EXISTS trg_videos_i18n_updated_at_upd;

CREATE TRIGGER trg_videos_i18n_updated_at_ins
AFTER INSERT ON videos_i18n
BEGIN
  UPDATE videos_i18n SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_videos_i18n_updated_at_upd
AFTER UPDATE ON videos_i18n
BEGIN
  UPDATE videos_i18n SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- VIDEO CHAPTERS ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_chapters (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id   INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  t_seconds  INTEGER NOT NULL CHECK (t_seconds >= 0),
  label_it   TEXT,
  label_en   TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (video_id, t_seconds)
);

CREATE INDEX IF NOT EXISTS idx_video_chapters_video ON video_chapters(video_id);
CREATE INDEX IF NOT EXISTS idx_video_chapters_time  ON video_chapters(t_seconds);

COMMIT;