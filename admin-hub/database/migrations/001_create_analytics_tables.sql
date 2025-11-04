-- ============================================
-- HUB ANALYTICS TABLES
-- Migration: 001_create_analytics_tables.sql
-- Data: 2025-11-04
-- ============================================

-- Eventi analytics centralizzati per tutti i moduli
CREATE TABLE IF NOT EXISTS hub_analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id TEXT NOT NULL,           -- 'contact-site', 'news-admin', 'bio-admin', etc.
  event_type TEXT NOT NULL,          -- 'link_click', 'page_view', 'download', etc.
  event_category TEXT,               -- 'social', 'contact', 'highlight', etc.
  event_label TEXT,                  -- 'Instagram', 'Email', 'Concerto XYZ', etc.
  event_value INTEGER DEFAULT 1,    -- Custom value (default 1 per evento)

  -- Privacy-friendly tracking
  user_session TEXT,                 -- Session ID (UUID anonimo)
  user_agent TEXT,                   -- Browser/device info
  referer TEXT,                      -- Da dove arriva l'utente
  ip_hash TEXT,                      -- IP hashato (SHA256) per privacy

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance query
CREATE INDEX IF NOT EXISTS idx_analytics_module_date
  ON hub_analytics_events(module_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_type_date
  ON hub_analytics_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_category_label
  ON hub_analytics_events(event_category, event_label, created_at DESC);

-- Vista aggregate per query veloci (ultimi 30 giorni)
CREATE VIEW IF NOT EXISTS view_analytics_summary_30d AS
SELECT
  module_id,
  event_type,
  event_category,
  event_label,
  COUNT(*) as event_count,
  DATE(created_at) as event_date
FROM hub_analytics_events
WHERE created_at >= datetime('now', '-30 days')
GROUP BY module_id, event_type, event_category, event_label, DATE(created_at)
ORDER BY event_count DESC;

-- Vista per top performing content (ultimi 30 giorni)
CREATE VIEW IF NOT EXISTS view_analytics_top_content AS
SELECT
  module_id,
  event_category,
  event_label,
  COUNT(*) as total_events,
  MAX(created_at) as last_event
FROM hub_analytics_events
WHERE created_at >= datetime('now', '-30 days')
GROUP BY module_id, event_category, event_label
ORDER BY total_events DESC
LIMIT 10;

-- Vista per statistiche giornaliere per modulo
CREATE VIEW IF NOT EXISTS view_analytics_daily_stats AS
SELECT
  module_id,
  DATE(created_at) as date,
  COUNT(*) as total_events,
  COUNT(DISTINCT event_category) as unique_categories,
  COUNT(DISTINCT user_session) as unique_sessions
FROM hub_analytics_events
WHERE created_at >= datetime('now', '-90 days')
GROUP BY module_id, DATE(created_at)
ORDER BY date DESC;
