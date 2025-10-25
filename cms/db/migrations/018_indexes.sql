BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- General performance/support indexes (idempotent)

-- concerts
CREATE INDEX IF NOT EXISTS idx_concerts_date ON concerts(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_concerts_slug_unique ON concerts(slug);

-- lineup
CREATE INDEX IF NOT EXISTS idx_event_lineup_event_sort ON event_lineup(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_lineup_type       ON event_lineup(performer_type);
CREATE INDEX IF NOT EXISTS idx_event_lineup_ensemble   ON event_lineup(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_event_lineup_artist     ON event_lineup(artist_id);

-- attendance
CREATE INDEX IF NOT EXISTS idx_event_attendance_event       ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_participant ON event_attendance(participant_id);

-- press
CREATE INDEX IF NOT EXISTS idx_press_items_date     ON press_items(date);
CREATE INDEX IF NOT EXISTS idx_press_i18n_press     ON press_i18n(press_id);

-- videos
CREATE INDEX IF NOT EXISTS idx_videos_event              ON videos(event_id);
CREATE INDEX IF NOT EXISTS idx_videos_status_published  ON videos(status, published_at);
CREATE INDEX IF NOT EXISTS idx_videos_platform_extid    ON videos(platform, external_id);

-- mailing
CREATE INDEX IF NOT EXISTS idx_contacts_status                ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_list_subscriptions_contact     ON list_subscriptions(contact_id);
CREATE INDEX IF NOT EXISTS idx_consents_contact_purpose       ON consents(contact_id, purpose);

-- media assets
CREATE INDEX IF NOT EXISTS idx_media_assets_category        ON media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_assets_cloudinary_id   ON media_assets(cloudinary_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_storage_path    ON media_assets(storage, path);

-- repertory & program
CREATE INDEX IF NOT EXISTS idx_event_program_items_event_sort ON event_program_items(event_id, sort_order);
-- (other repertory indexes were created in 017)

COMMIT;