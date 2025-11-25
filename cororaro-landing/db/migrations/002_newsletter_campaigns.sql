-- Migration per Newsletter Campaigns Coro Raro
-- Sistema di gestione campagne newsletter

-- ============================================
-- NEWSLETTER CAMPAIGNS
-- ============================================
-- Campagne newsletter per il Coro Raro
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Info campagna
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content_html TEXT,

  -- Status
  status TEXT DEFAULT 'draft', -- draft, sent, scheduled

  -- Sending
  scheduled_at DATETIME,
  sent_at DATETIME,
  sent_count INTEGER DEFAULT 0,

  -- Timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON newsletter_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_sent_at ON newsletter_campaigns(sent_at);

-- ============================================
-- TRIGGER per aggiornare updated_at
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_campaigns_timestamp
AFTER UPDATE ON newsletter_campaigns
FOR EACH ROW
BEGIN
  UPDATE newsletter_campaigns SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
