-- Migration 020: Landing Snapshots for Archive
-- Created: 2025-12-03
-- Purpose: Store full HTML snapshots of landing pages when events end

CREATE TABLE IF NOT EXISTS landing_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concert_id INTEGER NOT NULL UNIQUE,
  snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  html_content TEXT NOT NULL,
  custom_css TEXT,
  meta_data TEXT,  -- JSON: { title, date, location, performers, etc }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshots_concert ON landing_snapshots(concert_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON landing_snapshots(snapshot_date);
