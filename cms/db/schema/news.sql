BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS news_posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT UNIQUE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','scheduled')),
  title_it      TEXT NOT NULL,
  title_en      TEXT,
  excerpt_it    TEXT,
  excerpt_en    TEXT,
  content_it    TEXT NOT NULL,
  content_en    TEXT,
  cover_image   TEXT,
  gallery_images TEXT,
  category      TEXT DEFAULT 'news',
  tags          TEXT,
  author        TEXT DEFAULT 'Daniele Camiz',
  publish_date  TEXT,
  updated_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  meta_title_it TEXT,
  meta_title_en TEXT,
  meta_description_it TEXT,
  meta_description_en TEXT,
  social_share_on_publish INTEGER DEFAULT 0,
  social_providers TEXT,
  social_messages TEXT,
  social_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_news_status ON news_posts(status);
CREATE INDEX IF NOT EXISTS idx_news_publish_date ON news_posts(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news_posts(slug);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_posts(category);
CREATE INDEX IF NOT EXISTS idx_news_created ON news_posts(created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_news_updated_at
AFTER UPDATE ON news_posts
FOR EACH ROW BEGIN
  UPDATE news_posts SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE VIEW IF NOT EXISTS view_published_news AS
SELECT * FROM news_posts
WHERE status = 'published' 
  AND (publish_date IS NULL OR publish_date <= datetime('now'))
ORDER BY publish_date DESC, created_at DESC;

CREATE VIEW IF NOT EXISTS view_homepage_news AS
SELECT * FROM news_posts
WHERE status = 'published'
  AND (publish_date IS NULL OR publish_date <= datetime('now'))
ORDER BY publish_date DESC, created_at DESC
LIMIT 3;

COMMIT;