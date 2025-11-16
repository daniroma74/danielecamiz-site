-- Orchestra ICNT - Database Impostazioni Sito
-- Gestione contenuti modificabili dall'admin

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- === Impostazioni generali sito ===
CREATE TABLE IF NOT EXISTS site_settings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key   TEXT    NOT NULL UNIQUE,
  setting_value TEXT,
  description   TEXT,
  updated_at    TEXT    DEFAULT (datetime('now'))
);

-- Trigger per updated_at
CREATE TRIGGER IF NOT EXISTS trg_site_settings_updated_at
AFTER UPDATE ON site_settings
FOR EACH ROW BEGIN
  UPDATE site_settings SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- === Seed impostazioni iniziali ===

-- Hero Section
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('hero_background', '', 'Immagine di sfondo hero section (URL Cloudinary)'),
  ('hero_title', 'Orchestra ICNT', 'Titolo principale hero'),
  ('hero_subtitle', 'Musica Sinfonica a Roma', 'Sottotitolo hero'),
  ('hero_claim', 'Suoniamo, cresciamo, condividiamo. Insieme.', 'Frase claim hero'),
  ('hero_cta_primary_text', 'Prossimi Concerti', 'Testo primo pulsante CTA'),
  ('hero_cta_primary_link', '#concerti', 'Link primo pulsante CTA'),
  ('hero_cta_secondary_text', 'Scopri di più', 'Testo secondo pulsante CTA'),
  ('hero_cta_secondary_link', '#chi-siamo', 'Link secondo pulsante CTA');

-- Chi Siamo Section
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('about_label', 'La nostra storia', 'Etichetta sezione Chi Siamo'),
  ('about_title', 'Chi Siamo', 'Titolo sezione Chi Siamo'),
  ('about_image', '', 'Immagine gruppo orchestra (URL Cloudinary)'),
  ('about_badge_number', '50+', 'Numero badge (es. "50+")'),
  ('about_badge_label', 'Musicisti', 'Etichetta badge (es. "Musicisti")'),
  ('about_intro', '<p>L''<strong>Orchestra ICNT</strong> è un ensemble sinfonico che riunisce giovani studenti di musica e musicisti amatori appassionati, tutti accomunati dall''amore per la musica classica e dall''aspirazione all''eccellenza artistica.</p>', 'Testo introduttivo (HTML)'),
  ('about_description', '<p>Nata a Roma, la nostra orchestra si distingue per l''energia, l''entusiasmo e la dedizione dei suoi membri. Pur non essendo professionisti, molti dei nostri musicisti hanno raggiunto livelli di preparazione molto avanzati, permettendo all''orchestra di affrontare un repertorio sinfonico impegnativo e variegato.</p>', 'Descrizione completa (HTML)'),
  ('about_feature_1_icon', '🎵', 'Icona feature 1'),
  ('about_feature_1_title', 'Repertorio Classico', 'Titolo feature 1'),
  ('about_feature_1_text', 'Dai grandi classici alle opere contemporanee', 'Testo feature 1'),
  ('about_feature_2_icon', '🎓', 'Icona feature 2'),
  ('about_feature_2_title', 'Formazione Continua', 'Titolo feature 2'),
  ('about_feature_2_text', 'Crescita artistica e professionale costante', 'Testo feature 2'),
  ('about_feature_3_icon', '❤️', 'Icona feature 3'),
  ('about_feature_3_title', 'Passione e Dedizione', 'Titolo feature 3'),
  ('about_feature_3_text', 'Musicisti motivati e appassionati', 'Testo feature 3'),
  ('about_cta_text', 'Unisciti a noi', 'Testo pulsante CTA Chi Siamo'),
  ('about_cta_link', '#contatti', 'Link pulsante CTA Chi Siamo');

-- Media Section
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('media_label', 'Ascoltaci', 'Etichetta sezione Media'),
  ('media_title', 'Video e Registrazioni', 'Titolo sezione Media'),
  ('media_subtitle', 'Scopri le nostre performance', 'Sottotitolo sezione Media'),
  ('media_youtube_playlist_id', '', 'ID Playlist YouTube (lascia vuoto per caricare dal canale)'),
  ('media_video_1_mode', 'manual', 'Modalità Video 1: auto o manual'),
  ('media_video_1_url', '', 'URL Video YouTube 1'),
  ('media_video_1_title', '', 'Titolo Video YouTube 1'),
  ('media_video_2_mode', 'manual', 'Modalità Video 2: auto o manual'),
  ('media_video_2_url', '', 'URL Video YouTube 2'),
  ('media_video_2_title', '', 'Titolo Video YouTube 2'),
  ('media_video_3_mode', 'manual', 'Modalità Video 3: auto o manual'),
  ('media_video_3_url', '', 'URL Video YouTube 3'),
  ('media_video_3_title', '', 'Titolo Video YouTube 3');

-- Contatti Section
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('contact_title', 'Contattaci', 'Titolo sezione Contatti'),
  ('contact_subtitle', 'Hai domande? Siamo qui per aiutarti', 'Sottotitolo sezione Contatti'),
  ('contact_email', 'info@orchestraicnt.it', 'Email di contatto'),
  ('contact_phone', '+39 06 1234567', 'Telefono di contatto'),
  ('contact_address', 'Roma, Italia', 'Indirizzo');

-- Footer
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('footer_description', 'Orchestra sinfonica di giovani talenti e musicisti appassionati a Roma.', 'Descrizione nel footer'),
  ('footer_copyright', '© 2024 Orchestra ICNT. Tutti i diritti riservati.', 'Copyright footer'),
  ('social_facebook', '', 'URL Facebook'),
  ('social_instagram', '', 'URL Instagram'),
  ('social_youtube', '', 'URL YouTube'),
  ('social_twitter', '', 'URL Twitter');

-- SEO
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('site_title', 'Orchestra ICNT - Musica Sinfonica a Roma', 'Titolo sito (SEO)'),
  ('site_description', 'Orchestra sinfonica formata da giovani studenti e musicisti appassionati', 'Descrizione sito (SEO)'),
  ('site_keywords', 'orchestra, Roma, musica classica, concerti, ICNT, sinfonica', 'Keywords (SEO)');

-- Concerti Section
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('concerts_label', 'Stagione 2024/25', 'Etichetta sezione Concerti'),
  ('concerts_title', 'Prossimi Concerti', 'Titolo sezione Concerti'),
  ('concerts_subtitle', 'Non perdere i nostri eventi musicali', 'Sottotitolo sezione Concerti'),
  ('concerts_cta_text', 'Vedi tutta la stagione', 'Testo pulsante "Vedi tutta la stagione"'),
  ('concerts_cta_link', 'https://icnt.danielecamiz.com', 'Link pulsante "Vedi tutta la stagione"');

COMMIT;
