-- Migration: Aggiungi campi video YouTube sezione Media
-- Data: 2025-11-16

BEGIN TRANSACTION;

-- Video 1
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('media_video_1_url', '', 'URL Video YouTube 1'),
  ('media_video_1_title', '', 'Titolo Video YouTube 1');

-- Video 2
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('media_video_2_url', '', 'URL Video YouTube 2'),
  ('media_video_2_title', '', 'Titolo Video YouTube 2');

-- Video 3
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('media_video_3_url', '', 'URL Video YouTube 3'),
  ('media_video_3_title', '', 'Titolo Video YouTube 3');

COMMIT;
