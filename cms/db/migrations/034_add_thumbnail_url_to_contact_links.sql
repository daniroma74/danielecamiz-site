-- ============================================
-- Add thumbnail_url to contact_links
-- Migration: 034_add_thumbnail_url_to_contact_links.sql
-- Date: 2025-11-05
-- ============================================

-- Add thumbnail_url column for video/image previews
ALTER TABLE contact_links ADD COLUMN thumbnail_url TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_contact_links_thumbnail
  ON contact_links(thumbnail_url);
