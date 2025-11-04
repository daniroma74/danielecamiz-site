-- ============================================
-- CONTACT MODULE SEED DATA
-- Migration: 034_seed_contact_data.sql
-- Data: 2025-11-04
-- Popola tabelle con dati attuali da JSON
-- ============================================

-- Settings generali
INSERT OR REPLACE INTO contact_settings (
  id, name, role_it, role_en, bio_it, bio_en, avatar_url, footer_text_it, footer_text_en
) VALUES (
  1,
  'Daniele Camiz',
  'Direttore d''orchestra',
  'Conductor',
  'Musicista, direttore, pianista e insegnante. Music is magic',
  'Musician, conductor, pianist and teacher. Music is magic',
  '/img/daniele-camiz-foto-profilo.png',
  '© 2025 Daniele Camiz',
  '© 2025 Daniele Camiz'
);

-- Sezioni (titoli e ordine)
INSERT OR REPLACE INTO contact_sections (id, title_it, title_en, visible, order_index) VALUES
  ('highlights', 'In evidenza', 'Highlights', 1, 1),
  ('social', 'Seguimi sui social', 'Follow me', 1, 2),
  ('contact', 'Contatti diretti', 'Direct contact', 1, 3),
  ('extra', 'Altri link', 'More links', 1, 4);

-- ============================================
-- HIGHLIGHTS (3 link)
-- ============================================
INSERT INTO contact_links (category, title_it, title_en, url, icon, visible, order_index, target) VALUES
  ('highlight', '🎭 Prossimo Concerto - Magisterium 2025', '🎭 Next Concert - Magisterium 2025',
   'https://magisterium2025.danielecamiz.com', NULL, 1, 1, '_blank'),

  ('highlight', 'Stagione ICNT', 'ICNT Season',
   'https://icnt.danielecamiz.com', NULL, 1, 2, '_blank'),

  ('highlight', '🎬 Video Recenti', '🎬 Recent Videos',
   'https://staging.danielecamiz.com/video', NULL, 1, 3, '_blank');

-- ============================================
-- SOCIAL LINKS (6 link)
-- ============================================
INSERT INTO contact_links (category, title_it, title_en, url, icon, visible, order_index, target) VALUES
  ('social', 'Instagram', 'Instagram',
   'https://instagram.com/danielecamiz', 'instagram-gold.svg', 1, 1, '_blank'),

  ('social', 'Facebook', 'Facebook',
   'https://facebook.com/danielecamizofficial', 'facebook-gold.svg', 1, 2, '_blank'),

  ('social', 'YouTube', 'YouTube',
   'https://youtube.com/@danielecamiz', 'youtube-gold.svg', 1, 3, '_blank'),

  ('social', 'LinkedIn', 'LinkedIn',
   'https://linkedin.com/in/danielecamiz', 'linkedin-gold.svg', 1, 4, '_blank'),

  ('social', 'Twitter/X', 'Twitter/X',
   'https://twitter.com/danielecamiz', 'twitterx-gold.svg', 1, 5, '_blank'),

  ('social', 'Threads', 'Threads',
   'https://threads.net/@danielecamiz', 'threads-gold.svg', 1, 6, '_blank');

-- ============================================
-- CONTACT LINKS (3 link)
-- ============================================
INSERT INTO contact_links (category, title_it, title_en, url, icon, visible, order_index, target) VALUES
  ('contact', 'Email professionale', 'Professional Email',
   'mailto:info@danielecamiz.com', 'mail-gold.svg', 1, 1, '_self'),

  ('contact', 'WhatsApp', 'WhatsApp',
   'https://wa.me/393331234567', 'whatsapp-gold.svg', 1, 2, '_blank'),

  ('contact', 'Newsletter', 'Newsletter',
   'https://newsletter.danielecamiz.com', 'newsletter-gold.svg', 1, 3, '_blank');

-- ============================================
-- EXTRA LINKS (5 link) - USA STAGING!
-- ============================================
INSERT INTO contact_links (category, title_it, title_en, url, icon, visible, order_index, target, is_internal) VALUES
  ('extra', 'Sito Ufficiale', 'Official Website',
   'https://staging.danielecamiz.com', 'internet-gold.svg', 1, 1, '_blank', 1),

  ('extra', 'Biografia', 'Biography',
   'https://staging.danielecamiz.com/bio', 'bio-light-gold.svg', 1, 2, '_blank', 1),

  ('extra', 'Calendario Concerti', 'Concert Calendar',
   'https://staging.danielecamiz.com/concerti', 'calendar-gold.svg', 1, 3, '_blank', 1),

  ('extra', 'Press Kit', 'Press Kit',
   'https://staging.danielecamiz.com/stampa', 'press-light-gold.svg', 1, 4, '_blank', 1),

  ('extra', 'Bandcamp', 'Bandcamp',
   'https://danielecamiz.bandcamp.com', 'bandcamp-gold.svg', 1, 5, '_blank', 0);
