-- Coro Raro - Repertoire Database Schema

CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,          -- Codice paese (IT, ES, FR, etc)
  flag TEXT NOT NULL,                  -- Emoji bandiera
  name TEXT NOT NULL,                  -- Nome paese
  lat REAL NOT NULL,                   -- Latitudine
  lng REAL NOT NULL,                   -- Longitudine
  color TEXT NOT NULL,                 -- Colore per UI
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repertoire (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL,
  title TEXT NOT NULL,                 -- Titolo brano
  description TEXT,                    -- Descrizione
  audio_url TEXT,                      -- Link audio (YouTube, Spotify, file locale)
  sheet_music_url TEXT,                -- Link spartito PDF
  lyrics TEXT,                         -- Testo del brano
  language TEXT,                       -- Lingua
  difficulty TEXT,                     -- Difficoltà: easy, medium, hard
  duration_seconds INTEGER,            -- Durata in secondi
  is_active BOOLEAN DEFAULT 1,         -- Visibile sul sito
  sort_order INTEGER DEFAULT 0,        -- Ordinamento
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_repertoire_country ON repertoire(country_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_active ON repertoire(is_active);

-- Inserimento paesi
INSERT OR IGNORE INTO countries (code, flag, name, lat, lng, color) VALUES
  -- EUROPA
  ('IT', '🇮🇹', 'Italia', 41.9, 12.5, '#228B22'),
  ('ES', '🇪🇸', 'Spagna', 40.4, -3.7, '#C41E3A'),
  ('FR', '🇫🇷', 'Francia', 48.9, 2.3, '#0055A4'),
  ('DE', '🇩🇪', 'Germania', 52.5, 13.4, '#000000'),
  ('RU', '🇷🇺', 'Russia', 55.8, 37.6, '#DA291C'),
  ('GB', '🇬🇧', 'Regno Unito', 51.5, -0.1, '#012169'),
  ('GR', '🇬🇷', 'Grecia', 38.0, 23.7, '#0D5EAF'),

  -- AFRICA
  ('ZA', '🇿🇦', 'Sudafrica', -26.2, 28.0, '#007A4D'),
  ('NG', '🇳🇬', 'Nigeria', 9.1, 7.4, '#008751'),
  ('KE', '🇰🇪', 'Kenya', -1.3, 36.8, '#BB0000'),

  -- AMERICHE
  ('US', '🇺🇸', 'Stati Uniti', 38.9, -77.0, '#B22234'),
  ('BR', '🇧🇷', 'Brasile', -15.8, -47.9, '#009739'),
  ('AR', '🇦🇷', 'Argentina', -34.6, -58.4, '#74ACDF'),
  ('MX', '🇲🇽', 'Messico', 19.4, -99.1, '#006847'),
  ('PE', '🇵🇪', 'Perù', -12.0, -77.0, '#D91023'),

  -- ASIA
  ('CN', '🇨🇳', 'Cina', 39.9, 116.4, '#DE2910'),
  ('JP', '🇯🇵', 'Giappone', 35.7, 139.7, '#BC002D'),
  ('IN', '🇮🇳', 'India', 28.6, 77.2, '#FF9933'),
  ('IL', '🇮🇱', 'Israele', 31.8, 35.2, '#0038B8');

-- Inserimento brani di esempio (puoi espandere successivamente)
INSERT INTO repertoire (country_id, title, description, audio_url, language, difficulty) VALUES
  -- ITALIA
  (1, 'Bella Ciao', 'Canto partigiano tradizionale italiano', 'https://www.youtube.com/watch?v=4CI3lhyNKfo', 'Italiano', 'easy'),
  (1, 'Va Pensiero', 'Dal Nabucco di Giuseppe Verdi', NULL, 'Italiano', 'medium'),

  -- SPAGNA
  (2, 'El Cant dels Ocells', 'Canzone tradizionale catalana', NULL, 'Catalano', 'medium'),
  (2, 'Gracias a la Vida', 'Canzone popolare latinoamericana', NULL, 'Spagnolo', 'easy'),

  -- FRANCIA
  (3, 'Aux Champs-Élysées', 'Chanson française classica', NULL, 'Francese', 'easy'),

  -- GERMANIA
  (4, 'Die Gedanken sind frei', 'Lied popolare tedesco', NULL, 'Tedesco', 'medium'),

  -- RUSSIA
  (5, 'Kalinka', 'Canto popolare russo', NULL, 'Russo', 'hard'),
  (5, 'Катюша (Katyusha)', 'Famoso canto russo', NULL, 'Russo', 'medium'),

  -- REGNO UNITO
  (6, 'Scarborough Fair', 'Ballata folk inglese', NULL, 'Inglese', 'medium'),

  -- GRECIA
  (7, 'Zorba il Greco', 'Danza tradizionale greca', NULL, 'Greco', 'medium'),

  -- SUDAFRICA
  (8, 'Shosholoza', 'Canto tradizionale Zulu', NULL, 'Zulu', 'easy'),
  (8, 'Siyahamba', 'Gospel sudafricano', NULL, 'Zulu', 'easy'),

  -- NIGERIA
  (9, 'Ise Oluwa', 'Canto tradizionale Yoruba', NULL, 'Yoruba', 'medium'),

  -- KENYA
  (10, 'Jambo Bwana', 'Canzone di benvenuto swahili', NULL, 'Swahili', 'easy'),

  -- STATI UNITI
  (11, 'Swing Low, Sweet Chariot', 'Spiritual afroamericano', NULL, 'Inglese', 'easy'),
  (11, 'Amazing Grace', 'Inno cristiano tradizionale', NULL, 'Inglese', 'easy'),
  (11, 'Wade in the Water', 'Spiritual tradizionale', NULL, 'Inglese', 'medium'),

  -- BRASILE
  (12, 'Mas Que Nada', 'Bossa nova classica', NULL, 'Portoghese', 'hard'),
  (12, 'Aquarela do Brasil', 'Samba patriottico', NULL, 'Portoghese', 'medium'),

  -- ARGENTINA
  (13, 'Alfonsina y el Mar', 'Canzone folk argentina', NULL, 'Spagnolo', 'medium'),

  -- MESSICO
  (14, 'Cielito Lindo', 'Canzone tradizionale messicana', NULL, 'Spagnolo', 'easy'),
  (14, 'La Llorona', 'Canzone tradizionale messicana', NULL, 'Spagnolo', 'medium'),

  -- PERÙ
  (15, 'El Cóndor Pasa', 'Musica andina tradizionale', NULL, 'Quechua/Spagnolo', 'medium'),

  -- CINA
  (16, 'Mo Li Hua (Gelsomino)', 'Canzone popolare cinese', NULL, 'Cinese', 'medium'),

  -- GIAPPONE
  (17, 'Sakura Sakura', 'Canzone tradizionale giapponese', NULL, 'Giapponese', 'easy'),

  -- INDIA
  (18, 'Vande Mataram', 'Inno nazionale indiano', NULL, 'Hindi/Sanskrit', 'hard'),

  -- ISRAELE
  (19, 'Hava Nagila', 'Canto ebraico tradizionale', NULL, 'Ebraico', 'medium'),
  (19, 'Yerushalayim Shel Zahav', 'Jerusalem d''Oro', NULL, 'Ebraico', 'medium');
