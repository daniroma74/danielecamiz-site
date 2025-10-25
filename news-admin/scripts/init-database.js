// news-admin/scripts/init-database.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.MAIN_SQLITE_PATH || 
                path.join(__dirname, '..', '..', 'cms', 'db', 'main.sqlite');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'cms', 'db', 'schema', 'news.sql');

console.log('📰 Inizializzazione Database News\n');
console.log('Database:', DB_PATH);
console.log('Schema:', SCHEMA_PATH);

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database principale non trovato!');
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH);

// Verifica se la tabella esiste già
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='news_posts'", (err, row) => {
  if (err) {
    console.error('❌ Errore verifica tabella:', err.message);
    process.exit(1);
  }
  
  if (row) {
    console.log('\n✅ Tabella news_posts già esistente');
    console.log('   Per ricrearla, elimina prima la tabella esistente.\n');
    db.close();
    process.exit(0);
  }
  
  // Leggi schema
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error('❌ File schema non trovato:', SCHEMA_PATH);
    console.log('\n💡 Creazione schema in corso...\n');
    
    // Crea la directory se non esiste
    const schemaDir = path.dirname(SCHEMA_PATH);
    if (!fs.existsSync(schemaDir)) {
      fs.mkdirSync(schemaDir, { recursive: true });
    }
    
    // Schema inline (fallback)
    const schema = `
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS news_posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT UNIQUE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','scheduled')),
  title_it      TEXT NOT NULL,
  title_en      TEXT,
  excerpt_it    TEXT,
  excerpt_en    TEXT,
  content_it    TEXT NOT NULL,
  content_en    TEXT,
  cover_image   TEXT,
  gallery_images TEXT,
  category      TEXT DEFAULT 'news',
  tags          TEXT,
  author        TEXT DEFAULT 'Daniele Camiz',
  publish_date  TEXT,
  updated_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  meta_title_it TEXT,
  meta_title_en TEXT,
  meta_description_it TEXT,
  meta_description_en TEXT,
  social_share_on_publish INTEGER DEFAULT 0,
  social_providers TEXT,
  social_messages TEXT,
  social_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_news_status ON news_posts(status);
CREATE INDEX IF NOT EXISTS idx_news_publish_date ON news_posts(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news_posts(slug);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_posts(category);
CREATE INDEX IF NOT EXISTS idx_news_created ON news_posts(created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_news_updated_at
AFTER UPDATE ON news_posts
FOR EACH ROW BEGIN
  UPDATE news_posts SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE VIEW IF NOT EXISTS view_published_news AS
SELECT * FROM news_posts
WHERE status = 'published' 
  AND (publish_date IS NULL OR publish_date <= datetime('now'))
ORDER BY publish_date DESC, created_at DESC;

CREATE VIEW IF NOT EXISTS view_homepage_news AS
SELECT * FROM news_posts
WHERE status = 'published'
  AND (publish_date IS NULL OR publish_date <= datetime('now'))
ORDER BY publish_date DESC, created_at DESC
LIMIT 3;

COMMIT;
`;
    
    fs.writeFileSync(SCHEMA_PATH, schema.trim());
    console.log('✅ File schema creato:', SCHEMA_PATH);
  }
  
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  
  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Errore esecuzione schema:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log('\n✅ Tabella news_posts creata con successo!');
    console.log('✅ Indici creati');
    console.log('✅ Trigger creati');
    console.log('✅ Viste create\n');
    
    // Inserisci un post di esempio
    const examplePost = `
      INSERT INTO news_posts (
        slug, status, title_it, title_en, 
        excerpt_it, excerpt_en,
        content_it, content_en,
        category, tags, publish_date
      ) VALUES (
        'benvenuto-news-admin',
        'published',
        'Benvenuto nel nuovo sistema News',
        'Welcome to the new News system',
        'Il modulo NEWS-ADMIN è ora attivo e pronto per gestire gli articoli del sito.',
        'The NEWS-ADMIN module is now active and ready to manage site articles.',
        '<h2>Benvenuto!</h2><p>Il sistema di gestione news è ora completamente operativo. Puoi creare, modificare e pubblicare articoli con facilità.</p><p><strong>Funzionalità principali:</strong></p><ul><li>Editor ricco multilingua (IT/EN)</li><li>Upload immagini su Cloudinary</li><li>Pubblicazione automatica sui social</li><li>SEO ottimizzato</li><li>Programmazione pubblicazioni</li></ul>',
        '<h2>Welcome!</h2><p>The news management system is now fully operational. You can create, edit and publish articles with ease.</p><p><strong>Main features:</strong></p><ul><li>Rich multilingual editor (IT/EN)</li><li>Image upload to Cloudinary</li><li>Automatic social media publishing</li><li>SEO optimized</li><li>Publication scheduling</li></ul>',
        'news',
        '["amministrazione", "sistema"]',
        datetime('now')
      )
    `;
    
    db.run(examplePost, (err) => {
      if (err) {
        console.log('⚠️  Post di esempio non creato:', err.message);
      } else {
        console.log('✅ Post di esempio creato\n');
      }
      
      console.log('🎉 Inizializzazione completata!\n');
      console.log('Puoi ora avviare il server con: npm start\n');
      
      db.close();
    });
  });
});