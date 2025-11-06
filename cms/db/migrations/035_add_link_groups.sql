-- ============================================
-- ADD LINK GROUPS FOR LINKTREE-STYLE ORGANIZATION
-- Migration: 035_add_link_groups.sql
-- Date: 2025-11-06
-- Description: Adds link_groups table and group_id column to contact_links
--              for organizing highlights in groups (Linktree-style)
-- ============================================

-- Create link_groups table for grouping highlight links
CREATE TABLE IF NOT EXISTS link_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                      -- Nome del gruppo (es: "Nuovi Album", "Live Shows")
  category TEXT NOT NULL DEFAULT 'highlight', -- Categoria (per ora solo highlight)
  visible INTEGER DEFAULT 1,                -- Visibilità del gruppo
  order_index INTEGER DEFAULT 0,            -- Ordinamento gruppi
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add group_id column to contact_links (nullable for backward compatibility)
-- Links without group_id (NULL) will be displayed as "ungrouped"
ALTER TABLE contact_links ADD COLUMN group_id INTEGER REFERENCES link_groups(id) ON DELETE SET NULL;

-- Create index for better performance on group lookups
CREATE INDEX IF NOT EXISTS idx_contact_links_group_id
  ON contact_links(group_id);

-- Create index for ordering groups
CREATE INDEX IF NOT EXISTS idx_link_groups_order
  ON link_groups(category, order_index);

-- Insert default sample groups (optional, can be removed if not needed)
INSERT INTO link_groups (name, category, visible, order_index) VALUES
  ('Album Recenti', 'highlight', 1, 0),
  ('Concerti Live', 'highlight', 1, 1);

-- Update sample data: assign some existing highlights to groups (optional)
-- This is commented out - you can manually assign links to groups via editor
-- UPDATE contact_links SET group_id = 1 WHERE category = 'highlight' AND title_it LIKE '%album%';
-- UPDATE contact_links SET group_id = 2 WHERE category = 'highlight' AND title_it LIKE '%concert%';
