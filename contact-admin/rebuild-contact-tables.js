import { db } from './config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  console.log('🔄 Rebuilding contact tables...\n');

  // Read migration 033 (create tables)
  const createTablesPath = path.join(__dirname, '..', 'cms', 'db', 'migrations', '033_create_contact_tables.sql');
  const createTablesSql = fs.readFileSync(createTablesPath, 'utf-8');

  // Read migration 034_seed (seed data)
  const seedDataPath = path.join(__dirname, '..', 'cms', 'db', 'migrations', '034_seed_contact_data.sql');
  const seedDataSql = fs.readFileSync(seedDataPath, 'utf-8');

  // Execute create tables
  console.log('1️⃣ Creating contact tables...');
  const createStatements = createTablesSql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
  createStatements.forEach(stmt => {
    if (stmt.trim()) {
      db.exec(stmt);
    }
  });
  console.log('✅ Tables created\n');

  // Execute seed data
  console.log('2️⃣ Seeding contact data...');
  const seedStatements = seedDataSql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
  seedStatements.forEach(stmt => {
    if (stmt.trim()) {
      db.exec(stmt);
    }
  });
  console.log('✅ Data seeded\n');

  // Add thumbnail_url column
  console.log('3️⃣ Adding thumbnail_url column...');
  try {
    db.exec("ALTER TABLE contact_links ADD COLUMN thumbnail_url TEXT");
    console.log('✅ Added thumbnail_url column');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('⚠️  Column already exists');
    } else {
      throw e;
    }
  }

  // Add index
  db.exec("CREATE INDEX IF NOT EXISTS idx_contact_links_thumbnail ON contact_links(thumbnail_url)");
  console.log('✅ Created index on thumbnail_url\n');

  // Verify
  const count = db.prepare('SELECT COUNT(*) as count FROM contact_links').get();
  console.log(`✅ Contact tables rebuilt successfully! ${count.count} links in database.`);

} catch (error) {
  console.error('❌ Rebuild failed:', error.message);
  process.exit(1);
}
