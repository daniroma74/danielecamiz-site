-- Migration: Aggiungi footer_description
-- Data: 2025-11-16

BEGIN TRANSACTION;

-- Aggiungi footer_description se non esiste
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
  ('footer_description', 'Orchestra sinfonica di giovani talenti e musicisti appassionati a Roma.', 'Descrizione nel footer');

COMMIT;
