-- Migration: Aggiungi supporto auto/manual per video YouTube
-- Data: 2025-11-16

BEGIN TRANSACTION;

-- Playlist ID (opzionale, se vuoto usa il canale)
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('media_youtube_playlist_id', '', 'ID Playlist YouTube (lascia vuoto per caricare dal canale)');

-- Modalità per ogni video (auto = dalla playlist/canale, manual = URL inserito)
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('media_video_1_mode', 'manual', 'Modalità Video 1: auto o manual'),
  ('media_video_2_mode', 'manual', 'Modalità Video 2: auto o manual'),
  ('media_video_3_mode', 'manual', 'Modalità Video 3: auto o manual');

COMMIT;
