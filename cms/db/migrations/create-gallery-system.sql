-- Gallery System Schema
-- Sistema completo per gestione galleria multimediale con collezioni

-- Tabella collezioni (raccolte di media)
CREATE TABLE IF NOT EXISTS gallery_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'photo', -- 'photo', 'video', 'audio', 'mixed'

  -- Cover della collezione
  cover_cloudinary_id TEXT,
  cover_local_path TEXT,

  -- Contenuti bilingue
  title_it TEXT NOT NULL,
  title_en TEXT,
  description_it TEXT,
  description_en TEXT,

  -- Stati e ordinamento
  is_published BOOLEAN DEFAULT 0,
  is_featured BOOLEAN DEFAULT 0,
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tabella items della galleria (foto, video, audio)
CREATE TABLE IF NOT EXISTS gallery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER,
  item_type TEXT NOT NULL, -- 'photo', 'video', 'audio'

  -- Per foto: Cloudinary
  cloudinary_id TEXT,
  cloudinary_folder TEXT,
  cloudinary_transforms TEXT, -- JSON con trasformazioni

  -- Per video: YouTube
  youtube_id TEXT,
  youtube_channel_id TEXT,
  youtube_sync_date TEXT,
  is_spotlight BOOLEAN DEFAULT 0, -- Video in evidenza
  timecode TEXT, -- Timecode custom

  -- Per audio: Bandcamp
  bandcamp_url TEXT,
  bandcamp_embed_code TEXT,

  -- Contenuti bilingue
  title_it TEXT,
  title_en TEXT,
  description_it TEXT,
  description_en TEXT,
  alt_it TEXT, -- Alt text per accessibilità
  alt_en TEXT,
  credits TEXT, -- Crediti fotografo/artista

  -- Metadata tecnici
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- Durata in secondi (video/audio)
  file_size INTEGER,
  file_format TEXT,

  -- Stati e ordinamento
  is_published BOOLEAN DEFAULT 1,
  is_whitelisted BOOLEAN DEFAULT 1, -- Per video YouTube
  display_order INTEGER DEFAULT 0,

  -- Date
  taken_date TEXT, -- Data scatto/registrazione
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (collection_id) REFERENCES gallery_collections(id) ON DELETE SET NULL
);

-- Tabella per tracking sync YouTube
CREATE TABLE IF NOT EXISTS gallery_youtube_sync (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id TEXT NOT NULL,
  last_sync_date TEXT,
  sync_status TEXT, -- 'success', 'error', 'in_progress'
  videos_found INTEGER DEFAULT 0,
  videos_imported INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tabella per statistiche Cloudinary (cache)
CREATE TABLE IF NOT EXISTS gallery_cloudinary_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_images INTEGER DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_storage_bytes INTEGER DEFAULT 0,
  bandwidth_usage_bytes INTEGER DEFAULT 0,
  transformations_count INTEGER DEFAULT 0,
  last_updated TEXT DEFAULT (datetime('now'))
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_gallery_collections_type ON gallery_collections(type);
CREATE INDEX IF NOT EXISTS idx_gallery_collections_published ON gallery_collections(is_published);
CREATE INDEX IF NOT EXISTS idx_gallery_collections_featured ON gallery_collections(is_featured);

CREATE INDEX IF NOT EXISTS idx_gallery_items_collection ON gallery_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_gallery_items_type ON gallery_items(item_type);
CREATE INDEX IF NOT EXISTS idx_gallery_items_published ON gallery_items(is_published);
CREATE INDEX IF NOT EXISTS idx_gallery_items_youtube ON gallery_items(youtube_id);
CREATE INDEX IF NOT EXISTS idx_gallery_items_cloudinary ON gallery_items(cloudinary_id);

-- Inserisci statistiche iniziali Cloudinary (placeholder)
INSERT OR IGNORE INTO gallery_cloudinary_stats (id, total_images, total_videos, total_storage_bytes)
VALUES (1, 0, 0, 0);
