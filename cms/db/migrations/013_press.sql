

-- 013_press.sql
-- Press: citazioni+articoli con i18n e supporto PDF (media_assets)
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- PRESS ITEMS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS press_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  kind        TEXT    NOT NULL CHECK (kind IN ('citation','article')),
  publisher   TEXT,                       -- testata / fonte
  date        TEXT,                       -- ISO YYYY-MM-DD (opzionale)
  url         TEXT,                       -- link alla fonte online (opzionale)
  pdf_id      INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (url IS NULL OR substr(url,1,4) = 'http')
);

CREATE INDEX IF NOT EXISTS idx_press_items_date      ON press_items(date);
CREATE INDEX IF NOT EXISTS idx_press_items_publisher ON press_items(publisher);
CREATE INDEX IF NOT EXISTS idx_press_items_kind      ON press_items(kind);
CREATE INDEX IF NOT EXISTS idx_press_items_pdf       ON press_items(pdf_id);

-- updated_at triggers for press_items
DROP TRIGGER IF EXISTS trg_press_items_updated_at_ins;
DROP TRIGGER IF EXISTS trg_press_items_updated_at_upd;

CREATE TRIGGER trg_press_items_updated_at_ins
AFTER INSERT ON press_items
BEGIN
  UPDATE press_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_press_items_updated_at_upd
AFTER UPDATE ON press_items
BEGIN
  UPDATE press_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- PRESS I18N --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS press_i18n (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  press_id    INTEGER NOT NULL REFERENCES press_items(id) ON DELETE CASCADE,
  lang        TEXT    NOT NULL CHECK (lang IN ('it','en')),
  title       TEXT    NOT NULL,
  excerpt     TEXT,                       -- breve anteprima
  body_md     TEXT,                       -- corpo in Markdown (render SSR)
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (press_id, lang)
);

CREATE INDEX IF NOT EXISTS idx_press_i18n_press ON press_i18n(press_id);
CREATE INDEX IF NOT EXISTS idx_press_i18n_lang  ON press_i18n(lang);

-- updated_at triggers for press_i18n
DROP TRIGGER IF EXISTS trg_press_i18n_updated_at_ins;
DROP TRIGGER IF EXISTS trg_press_i18n_updated_at_upd;

CREATE TRIGGER trg_press_i18n_updated_at_ins
AFTER INSERT ON press_i18n
BEGIN
  UPDATE press_i18n SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_press_i18n_updated_at_upd
AFTER UPDATE ON press_i18n
BEGIN
  UPDATE press_i18n SET updated_at = datetime('now') WHERE id = NEW.id;
END;

COMMIT;