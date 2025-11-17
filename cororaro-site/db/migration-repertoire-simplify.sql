-- Migration: Simplify repertoire table
-- Date: 2025-11-17
-- Description: Add lyrics_original and lyrics_italian fields, remove unused fields

-- Add new columns for lyrics in original language and Italian translation
ALTER TABLE repertoire ADD COLUMN lyrics_original TEXT;
ALTER TABLE repertoire ADD COLUMN lyrics_italian TEXT;

-- Migrate existing lyrics data to lyrics_original (for backward compatibility)
UPDATE repertoire SET lyrics_original = lyrics WHERE lyrics IS NOT NULL;

-- Note: We keep the old columns for now to avoid breaking existing data
-- The old columns (difficulty, duration_seconds, sheet_music_url, sort_order, lyrics)
-- will no longer be used by the admin interface but remain in the database
-- for data preservation and potential future needs.
