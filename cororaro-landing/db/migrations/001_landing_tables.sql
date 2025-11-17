-- Migration per Landing Pages Coro Raro
-- Tabelle per landing settings, prenotazioni e newsletter

-- ============================================
-- CONCERT LANDING SETTINGS
-- ============================================
-- Personalizzazione della landing page per ogni concerto
CREATE TABLE IF NOT EXISTS concert_landing_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concert_id INTEGER NOT NULL UNIQUE,

  -- Contenuti personalizzabili
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  description_html TEXT,

  -- Sezioni attive
  show_program BOOLEAN DEFAULT 1,
  show_location BOOLEAN DEFAULT 1,
  show_booking_form BOOLEAN DEFAULT 1,
  show_gallery BOOLEAN DEFAULT 0,

  -- Galleria immagini (JSON array)
  gallery_images TEXT,

  -- Impostazioni prenotazioni
  booking_enabled BOOLEAN DEFAULT 1,
  max_seats_per_booking INTEGER DEFAULT 4,
  booking_deadline DATE,

  -- Newsletter opt-in
  newsletter_enabled BOOLEAN DEFAULT 1,
  newsletter_text TEXT DEFAULT 'Vuoi ricevere aggiornamenti sui prossimi concerti?',

  -- Personalizzazione estetica
  primary_color TEXT DEFAULT '#8B4513',
  secondary_color TEXT DEFAULT '#4a7c59',

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,

  -- Timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
);

-- ============================================
-- CONCERT BOOKINGS
-- ============================================
-- Prenotazioni per i concerti
CREATE TABLE IF NOT EXISTS concert_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concert_id INTEGER NOT NULL,

  -- Dati prenotazione
  booking_code TEXT NOT NULL UNIQUE,
  seats INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, cancelled

  -- Dati utente
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Newsletter opt-in
  newsletter_optin BOOLEAN DEFAULT 0,

  -- Note
  notes TEXT,

  -- Email inviate
  confirmation_sent BOOLEAN DEFAULT 0,
  reminder_sent BOOLEAN DEFAULT 0,

  -- Timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cancelled_at DATETIME,

  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bookings_concert ON concert_bookings(concert_id);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON concert_bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON concert_bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON concert_bookings(status);

-- ============================================
-- CONCERT NEWSLETTER
-- ============================================
-- Raccolta email per newsletter concerti futuri
CREATE TABLE IF NOT EXISTS concert_newsletter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,

  -- Consenso
  optin_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  optin_source TEXT, -- booking, landing_form, manual
  optin_concert_id INTEGER, -- da quale concerto è arrivato

  -- Status
  is_active BOOLEAN DEFAULT 1,
  unsubscribed_at DATETIME,

  -- Timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (optin_concert_id) REFERENCES concerts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON concert_newsletter(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON concert_newsletter(is_active);

-- ============================================
-- TRIGGER per aggiornare updated_at
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_landing_settings_timestamp
AFTER UPDATE ON concert_landing_settings
FOR EACH ROW
BEGIN
  UPDATE concert_landing_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_newsletter_timestamp
AFTER UPDATE ON concert_newsletter
FOR EACH ROW
BEGIN
  UPDATE concert_newsletter SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
