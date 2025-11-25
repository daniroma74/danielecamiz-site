-- Migration: Create press_kit_files table
-- Date: 2025-11-21
-- Purpose: Unified press-kit file management (photos, videos, documents)

CREATE TABLE IF NOT EXISTS press_kit_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('photo', 'video', 'document')),
  category TEXT, -- es. 'portrait', 'action', 'backstage' per photo; 'cv', 'bio' per document

  -- Cloudinary
  cloudinary_id TEXT,
  cloudinary_url TEXT,

  -- YouTube (per video)
  youtube_id TEXT,
  youtube_url TEXT,

  -- Metadata multilingua
  title_it TEXT,
  title_en TEXT,
  description_it TEXT,
  description_en TEXT,

  -- Display & Organization
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT 0,
  is_published BOOLEAN DEFAULT 1,

  -- File info
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  format TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_press_kit_type ON press_kit_files(type);
CREATE INDEX IF NOT EXISTS idx_press_kit_category ON press_kit_files(category);
CREATE INDEX IF NOT EXISTS idx_press_kit_order ON press_kit_files(type, display_order);
CREATE INDEX IF NOT EXISTS idx_press_kit_published ON press_kit_files(is_published);

-- Trigger per updated_at
CREATE TRIGGER IF NOT EXISTS trg_press_kit_files_updated_at
AFTER UPDATE ON press_kit_files
FOR EACH ROW BEGIN
  UPDATE press_kit_files SET updated_at = datetime('now') WHERE id = OLD.id;
END;
