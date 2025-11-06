#!/usr/bin/env node
// Emergency database recovery and rebuild
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');

console.log('🚨 EMERGENCY DATABASE RECOVERY\n');
console.log(`Database: ${dbPath}\n`);

// Step 1: Backup corrupted database
const backupPath = dbPath + '.corrupted.' + Date.now();
try {
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backed up corrupted DB to: ${backupPath}\n`);
  }
} catch (e) {
  console.error('⚠️  Backup failed:', e.message);
}

// Step 2: Try to extract data from corrupted DB
let recoveredSettings = null;
let recoveredLinks = [];

console.log('🔄 Attempting to recover data from corrupted database...\n');

try {
  const oldDb = new Database(dbPath);

  // Try to recover settings
  try {
    recoveredSettings = oldDb.prepare('SELECT * FROM contact_settings WHERE id = 1').get();
    console.log('✅ Recovered settings:', recoveredSettings?.name);
  } catch (e) {
    console.log('❌ Could not recover settings:', e.message);
  }

  // Try to recover links
  try {
    recoveredLinks = oldDb.prepare('SELECT * FROM contact_links').all();
    console.log(`✅ Recovered ${recoveredLinks.length} links`);
  } catch (e) {
    console.log('❌ Could not recover links:', e.message);
  }

  oldDb.close();
} catch (e) {
  console.log('❌ Could not open corrupted database:', e.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// Step 3: Delete corrupted database
try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ Deleted corrupted database\n');
  }

  // Delete WAL and SHM files if they exist
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

} catch (e) {
  console.error('❌ Could not delete corrupted files:', e.message);
  process.exit(1);
}

// Step 4: Create fresh database
console.log('🔨 Creating fresh database...\n');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Read and execute schema creation
const schemaPath = path.join(__dirname, '..', 'cms', 'db', 'migrations', '033_create_contact_tables.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);
console.log('✅ Created tables\n');

// Add thumbnail column
try {
  db.exec("ALTER TABLE contact_links ADD COLUMN thumbnail_url TEXT");
} catch (e) {
  // Column might already be in schema
}

db.exec("CREATE INDEX IF NOT EXISTS idx_contact_links_thumbnail ON contact_links(thumbnail_url)");

// Step 5: Restore data if recovered
if (recoveredSettings && recoveredLinks.length > 0) {
  console.log('🔄 Restoring recovered data...\n');

  // Restore settings
  const settingsStmt = db.prepare(`
    INSERT INTO contact_settings (
      id, name, role_it, role_en, bio_it, bio_en, avatar_url,
      footer_text_it, footer_text_en
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  settingsStmt.run(
    1,
    recoveredSettings.name,
    recoveredSettings.role_it,
    recoveredSettings.role_en,
    recoveredSettings.bio_it,
    recoveredSettings.bio_en,
    recoveredSettings.avatar_url,
    recoveredSettings.footer_text_it || '© 2025 Daniele Camiz',
    recoveredSettings.footer_text_en || '© 2025 Daniele Camiz'
  );
  console.log('✅ Restored settings');

  // Restore links
  const linkStmt = db.prepare(`
    INSERT INTO contact_links (
      id, category, title_it, title_en, url, icon, visible,
      order_index, target, badge_text, badge_color,
      scheduled_start, scheduled_end, is_internal,
      description_it, description_en, thumbnail_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  recoveredLinks.forEach(link => {
    linkStmt.run(
      link.id,
      link.category,
      link.title_it,
      link.title_en,
      link.url,
      link.icon,
      link.visible || 1,
      link.order_index || 0,
      link.target || '_blank',
      link.badge_text,
      link.badge_color,
      link.scheduled_start,
      link.scheduled_end,
      link.is_internal || 0,
      link.description_it,
      link.description_en,
      link.thumbnail_url
    );
  });
  console.log(`✅ Restored ${recoveredLinks.length} links`);

  // Restore sections
  const sectionsStmt = db.prepare(`
    INSERT OR REPLACE INTO contact_sections (id, title_it, title_en, visible, order_index)
    VALUES (?, ?, ?, ?, ?)
  `);

  const sections = [
    ['highlights', 'In evidenza', 'Highlights', 1, 1],
    ['social', 'Seguimi sui social', 'Follow me', 1, 2],
    ['contact', 'Contatti diretti', 'Direct contact', 1, 3],
    ['extra', 'Altri link', 'More links', 1, 4]
  ];

  sections.forEach(s => sectionsStmt.run(...s));
  console.log('✅ Created sections');

} else {
  // No data recovered, use seed data
  console.log('⚠️  No data recovered, seeding with defaults...\n');
  const seedPath = path.join(__dirname, '..', 'cms', 'db', 'migrations', '034_seed_contact_data.sql');
  if (fs.existsSync(seedPath)) {
    const seed = fs.readFileSync(seedPath, 'utf-8');
    db.exec(seed);
    console.log('✅ Seeded with default data');
  }
}

// Verify
const finalSettings = db.prepare('SELECT * FROM contact_settings WHERE id = 1').get();
const finalLinks = db.prepare('SELECT COUNT(*) as count FROM contact_links').get();

console.log('\n' + '='.repeat(60));
console.log('✅ DATABASE REBUILD COMPLETE!');
console.log('='.repeat(60));
console.log(`\nSettings: ${finalSettings.name}`);
console.log(`Links: ${finalLinks.count} records`);
console.log(`\nBackup of corrupted DB: ${backupPath}`);
console.log('\n⚠️  Please restart PM2 services now:\n');
console.log('    pm2 restart contact-admin contact-site\n');

db.close();
