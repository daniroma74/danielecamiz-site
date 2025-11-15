-- Migration 003: Creazione tabelle per gestione contenuti sito
-- Eseguito il: 2024-11-15

-- =====================================================
-- 1. IMPOSTAZIONI SITO (Hero, Footer, Testi generali)
-- =====================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'text', -- text, html, image, json
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserisci impostazioni default
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
('hero_logo', '/assets/images/cororaro_logo-completo.png', 'image', 'Logo hero section'),
('hero_claim', '20 anni di musica, solidarietà e cultura a Prati Fiscali, Roma', 'text', 'Claim hero section'),
('hero_background', '/assets/images/hero-coro.jpg', 'image', 'Immagine di sfondo hero'),
('hero_stat_years', '20', 'text', 'Statistica: Anni di attività'),
('hero_stat_continents', '5', 'text', 'Statistica: Continenti'),
('hero_stat_emotions', '∞', 'text', 'Statistica: Emozioni'),
('hero_cta_concerts', 'Prossimi Concerti', 'text', 'Testo bottone concerti'),
('hero_cta_join', 'Canta con Noi', 'text', 'Testo bottone unisciti'),

('about_label', 'La Nostra Storia', 'text', 'Label sezione Chi Siamo'),
('about_title', 'Chi Siamo', 'text', 'Titolo sezione Chi Siamo'),
('about_lead', '<p>Il <strong>Coro Raro</strong> è un coro polifonico nato circa 20 anni fa nel quartiere <strong>Prati Fiscali</strong> di Roma, con la missione di unire l''amore per la musica alla solidarietà verso chi ha bisogno.</p>', 'html', 'Testo principale Chi Siamo'),
('about_text_1', '<p>Non siamo professionisti, ma coristi appassionati di tutte le età che condividono la gioia di cantare insieme. La nostra età media è avanzata, ma il nostro spirito è giovane e il nostro cuore grande.</p>', 'html', 'Paragrafo 1 Chi Siamo'),
('about_text_2', '<p>Guidati dai nostri direttori, esploriamo un <strong>repertorio unico</strong> fatto di musiche dal mondo: canti africani, asiatici, europei, folkloristici e tradizionali in decine di lingue diverse. Ogni brano è un viaggio, ogni concerto un''esperienza.</p>', 'html', 'Paragrafo 2 Chi Siamo'),
('about_image', '/assets/images/coro-gruppo.png', 'image', 'Immagine Chi Siamo'),
('about_badge_year', 'Dal 2005', 'text', 'Anno di fondazione'),
('about_badge_location', 'Prati Fiscali', 'text', 'Luogo'),

('projects_label', 'La Nostra Missione', 'text', 'Label sezione Progetti'),
('projects_title', 'Progetti di Solidarietà', 'text', 'Titolo sezione Progetti'),
('projects_subtitle', 'Cantiamo per aiutare comunità in difficoltà in tutto il mondo', 'text', 'Sottotitolo sezione Progetti'),
('projects_intro', '<p>Ogni nostro concerto ha uno <strong>scopo benefico</strong>. I fondi raccolti vengono destinati a progetti concreti: medicinali, cure mediche, sostegno ad economie locali, istruzione, e molto altro.</p><p>In 20 anni abbiamo portato il nostro piccolo contributo in molte parti del mondo, sempre con l''obiettivo di fare la differenza nella vita di chi ha più bisogno.</p>', 'html', 'Introduzione Progetti'),
('projects_stat_funds', '€50k+', 'text', 'Statistica: Fondi raccolti'),
('projects_stat_projects', '20+', 'text', 'Statistica: Progetti'),
('projects_stat_countries', '15+', 'text', 'Statistica: Paesi'),

('footer_text', '© 2024 Coro Raro - Prati Fiscali, Roma', 'text', 'Testo footer'),
('contact_email', 'info@cororaro.it', 'text', 'Email contatto'),
('social_facebook', '', 'text', 'URL Facebook'),
('social_instagram', '', 'text', 'URL Instagram'),
('social_youtube', '', 'text', 'URL YouTube');

-- =====================================================
-- 2. MEMBRI DEL TEAM (Direttori, Coristi, Staff)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL, -- director, co-director, chorister, staff
  bio TEXT,
  photo_url TEXT,
  email TEXT,
  phone TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserisci direttori default
INSERT INTO team_members (full_name, role, sort_order, is_active) VALUES
('Daniele Camiz', 'director', 1, 1),
('Marida Augeri', 'co-director', 2, 1);

-- =====================================================
-- 3. VALORI DEL CORO
-- =====================================================
CREATE TABLE IF NOT EXISTS core_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icon TEXT NOT NULL, -- emoji o classe icona
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserisci valori default
INSERT INTO core_values (icon, title, description, sort_order) VALUES
('🎵', 'Passione', 'L''amore per la musica ci unisce e ci guida', 1),
('🌍', 'Solidarietà', 'Ogni concerto per aiutare chi ha bisogno', 2),
('🤝', 'Inclusione', 'Tutti possono cantare, senza limiti di età', 3),
('🌺', 'Cultura', 'Esploriamo tradizioni musicali da tutto il mondo', 4);

-- =====================================================
-- 4. CONCERTI
-- =====================================================
CREATE TABLE IF NOT EXISTS concerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT, -- es. "18:00"
  location TEXT NOT NULL,
  address TEXT,
  cause TEXT, -- Causa benefica
  program TEXT, -- Programma musicale
  description TEXT, -- Descrizione HTML
  poster_url TEXT, -- URL locandina
  ticket_url TEXT, -- Link prenotazioni
  is_featured BOOLEAN DEFAULT 0,
  is_published BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserisci concerti di esempio
INSERT INTO concerts (title, date, time, location, address, cause, program, is_published) VALUES
('Concerto di Natale Solidale', '2024-12-15', '18:00', 'Chiesa di San Francesco', 'Prati Fiscali, Roma', 'Ospedale pediatrico in Kenya', 'Canti di Natale dal mondo, spirituals, tradizioni europee', 1),
('Voci dall''Africa', '2025-02-20', '20:30', 'Auditorium Prati Fiscali', 'Roma', 'Scuola rurale in Tanzania', 'Repertorio africano tradizionale e contemporaneo', 1);

-- =====================================================
-- 5. PROGETTI DI SOLIDARIETÀ
-- =====================================================
CREATE TABLE IF NOT EXISTS solidarity_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icon TEXT, -- emoji o classe icona
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT, -- HTML
  country TEXT,
  amount_raised DECIMAL(10,2),
  year INTEGER,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserisci progetti di esempio
INSERT INTO solidarity_projects (icon, title, description, is_active, sort_order) VALUES
('💊', 'Medicinali e Cure', 'Supporto sanitario a comunità remote e ospedali in difficoltà', 1, 1),
('🏫', 'Istruzione', 'Materiale scolastico e sostegno a scuole in aree svantaggiate', 1, 2),
('🌾', 'Economie Locali', 'Sostegno a piccole imprese e cooperative nei paesi in via di sviluppo', 1, 3),
('💧', 'Acqua e Risorse', 'Pozzi, cisterne e accesso all''acqua potabile', 1, 4);

-- =====================================================
-- 6. GALLERIA IMMAGINI
-- =====================================================
CREATE TABLE IF NOT EXISTS gallery_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  caption TEXT,
  cloudinary_id TEXT, -- Public ID Cloudinary
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT, -- concerts, rehearsals, group, events
  is_featured BOOLEAN DEFAULT 0,
  is_published BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserisci immagini placeholder
INSERT INTO gallery_images (title, caption, image_url, category, is_published) VALUES
('Concerto di Natale 2023', 'Concerto di Natale 2023', '/assets/images/gallery/concerto-1.jpg', 'concerts', 1),
('Prove settimanali', 'Prove settimanali', '/assets/images/gallery/prove-1.jpg', 'rehearsals', 1),
('Il nostro coro', 'Il nostro coro', '/assets/images/gallery/gruppo-1.jpg', 'group', 1),
('Evento benefico', 'Evento benefico', '/assets/images/gallery/evento-1.jpg', 'events', 1);

-- =====================================================
-- 7. SEZIONE "UNISCITI A NOI"
-- =====================================================
CREATE TABLE IF NOT EXISTS join_info (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Solo 1 riga
  title TEXT DEFAULT 'Unisciti a Noi',
  subtitle TEXT,
  intro_text TEXT,
  benefits_html TEXT,
  rehearsal_day TEXT,
  rehearsal_time TEXT,
  rehearsal_location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  cta_text TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserisci info default
INSERT INTO join_info (id, subtitle, intro_text, rehearsal_day, rehearsal_time, rehearsal_location, contact_email) VALUES
(1, 'Vieni a cantare con noi!', 'Non serve essere professionisti, solo tanta passione per la musica e voglia di fare del bene.', 'Martedì', '20:00 - 22:00', 'Via delle Isole Curzolane, Roma', 'info@cororaro.it');

-- =====================================================
-- TRIGGER PER AGGIORNAMENTO TIMESTAMP
-- =====================================================
CREATE TRIGGER IF NOT EXISTS update_site_settings_timestamp
AFTER UPDATE ON site_settings
BEGIN
  UPDATE site_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_team_members_timestamp
AFTER UPDATE ON team_members
BEGIN
  UPDATE team_members SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_concerts_timestamp
AFTER UPDATE ON concerts
BEGIN
  UPDATE concerts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_solidarity_projects_timestamp
AFTER UPDATE ON solidarity_projects
BEGIN
  UPDATE solidarity_projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_gallery_images_timestamp
AFTER UPDATE ON gallery_images
BEGIN
  UPDATE gallery_images SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_join_info_timestamp
AFTER UPDATE ON join_info
BEGIN
  UPDATE join_info SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
