-- Migration: Add newsletter preferences fields
-- Date: 2025-11-21
-- Purpose: Add wants_site_news and wants_concerts columns for segmentation

-- Add preference columns to newsletter_subscribers
ALTER TABLE newsletter_subscribers
  ADD COLUMN wants_site_news INTEGER DEFAULT 1 CHECK(wants_site_news IN (0,1));

ALTER TABLE newsletter_subscribers
  ADD COLUMN wants_concerts INTEGER DEFAULT 1 CHECK(wants_concerts IN (0,1));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ns_wants_site ON newsletter_subscribers(wants_site_news);
CREATE INDEX IF NOT EXISTS idx_ns_wants_concerts ON newsletter_subscribers(wants_concerts);

-- Update existing subscribers to have both preferences enabled (backward compatibility)
UPDATE newsletter_subscribers
SET wants_site_news = 1, wants_concerts = 1
WHERE wants_site_news IS NULL OR wants_concerts IS NULL;
