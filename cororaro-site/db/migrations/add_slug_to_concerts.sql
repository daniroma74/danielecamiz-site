-- Migration: Add slug column to concerts table
-- Coro Raro - Landing Pages System

-- Add slug column
ALTER TABLE concerts ADD COLUMN slug TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX idx_concerts_slug ON concerts(slug);

-- Generate slugs for existing concerts
-- Format: lowercase, replace spaces with hyphens, remove special chars
UPDATE concerts
SET slug = LOWER(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(title, ' ', '-'),
      "'", ''),
    '"', ''),
  '.', '')
)
WHERE slug IS NULL;

-- Add counter for duplicates if needed
-- This ensures uniqueness by appending -2, -3, etc. to duplicates
WITH ranked AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
  FROM concerts
)
UPDATE concerts
SET slug = CASE
  WHEN (SELECT rn FROM ranked WHERE ranked.id = concerts.id) > 1
  THEN concerts.slug || '-' || (SELECT rn FROM ranked WHERE ranked.id = concerts.id)
  ELSE concerts.slug
END;
