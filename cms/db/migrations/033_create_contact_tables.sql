-- ============================================
-- CONTACT MODULE TABLES
-- Migration: 033_create_contact_tables.sql
-- Data: 2025-11-04
-- ============================================

-- Settings generali del contact site
CREATE TABLE IF NOT EXISTS contact_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'Daniele Camiz',
  role_it TEXT DEFAULT 'Direttore d''orchestra',
  role_en TEXT DEFAULT 'Conductor',
  bio_it TEXT DEFAULT 'Musicista, direttore, pianista e insegnante. Music is magic',
  bio_en TEXT DEFAULT 'Musician, conductor, pianist and teacher. Music is magic',
  avatar_url TEXT DEFAULT '/img/daniele-camiz-foto-profilo.png',
  footer_text_it TEXT DEFAULT '© 2025 Daniele Camiz',
  footer_text_en TEXT DEFAULT '© 2025 Daniele Camiz',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: solo 1 riga
  CHECK (id = 1)
);

-- Link di tutti i tipi (highlights, social, contact, extra)
CREATE TABLE IF NOT EXISTS contact_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN ('highlight', 'social', 'contact', 'extra')),

  -- Contenuto bilingue
  title_it TEXT NOT NULL,
  title_en TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,                          -- Nome file icona (es: 'instagram-gold.svg')

  -- Visibilità e ordine
  visible INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  target TEXT DEFAULT '_blank',

  -- Badge (es: 'NUOVO', 'LIVE', 'SOLD OUT')
  badge_text TEXT,
  badge_color TEXT DEFAULT '#FFD700',  -- Gold di default

  -- Scheduling automatico
  scheduled_start DATETIME,            -- Da quando mostrare
  scheduled_end DATETIME,              -- Fino a quando mostrare

  -- Metadata
  is_internal INTEGER DEFAULT 0,       -- Se punta al nostro dominio
  description_it TEXT,                 -- Descrizione opzionale
  description_en TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sezioni (titoli, ordine, visibilità)
CREATE TABLE IF NOT EXISTS contact_sections (
  id TEXT PRIMARY KEY CHECK(id IN ('highlights', 'social', 'contact', 'extra')),
  title_it TEXT NOT NULL,
  title_en TEXT NOT NULL,
  visible INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_contact_links_category
  ON contact_links(category, order_index);

CREATE INDEX IF NOT EXISTS idx_contact_links_visible
  ON contact_links(visible, category);

CREATE INDEX IF NOT EXISTS idx_contact_links_scheduled
  ON contact_links(scheduled_start, scheduled_end);

-- Vista per link attivi (visibili + dentro scheduling)
CREATE VIEW IF NOT EXISTS view_active_contact_links AS
SELECT *
FROM contact_links
WHERE visible = 1
  AND (scheduled_start IS NULL OR scheduled_start <= datetime('now'))
  AND (scheduled_end IS NULL OR scheduled_end >= datetime('now'))
ORDER BY category, order_index;

-- Vista per link con conteggio click (join con analytics)
CREATE VIEW IF NOT EXISTS view_contact_links_with_stats AS
SELECT
  cl.*,
  COUNT(ae.id) as click_count,
  MAX(ae.created_at) as last_click
FROM contact_links cl
LEFT JOIN hub_analytics_events ae
  ON ae.module_id = 'contact-site'
  AND ae.event_type = 'link_click'
  AND ae.event_label = cl.title_it
  AND ae.created_at >= datetime('now', '-30 days')
GROUP BY cl.id
ORDER BY cl.category, cl.order_index;
