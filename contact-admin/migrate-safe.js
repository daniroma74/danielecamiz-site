import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');

try {
  console.log('🔄 Running safe database migration...\n');
  console.log(`📁 Database: ${dbPath}\n`);

  // Open database
  const db = new Database(dbPath);

  // Check if data already exists
  let hasData = false;
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM contact_settings').get();
    hasData = count && count.count > 0;
  } catch (e) {
    // Table doesn't exist yet
    hasData = false;
  }

  if (hasData) {
    console.log('✅ Database already has data - skipping seed to preserve your changes!\n');

    // Only run structure updates (no data overwrites)
    console.log('🔧 Checking for structure updates...\n');
  } else {
    console.log('📦 Empty database detected - will create tables and seed initial data\n');
  }

  // 1. Create tables (safe - uses CREATE TABLE IF NOT EXISTS)
  console.log('1️⃣ Creating/updating contact tables...');
  const createTablesPath = path.join(__dirname, '..', 'cms', 'db', 'migrations', '033_create_contact_tables.sql');
  if (fs.existsSync(createTablesPath)) {
    const createTablesSql = fs.readFileSync(createTablesPath, 'utf-8');
    db.exec(createTablesSql);
    console.log('✅ Tables created/verified\n');
  } else {
    console.log('⚠️  Migration file not found, skipping\n');
  }

  // 2. Add thumbnail_url column (safe - checks for duplicate)
  console.log('2️⃣ Adding thumbnail_url column...');
  try {
    db.exec("ALTER TABLE contact_links ADD COLUMN thumbnail_url TEXT");
    console.log('✅ Added thumbnail_url column');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('✅ Column already exists');
    } else {
      throw e;
    }
  }

  // Add index (safe)
  db.exec("CREATE INDEX IF NOT EXISTS idx_contact_links_thumbnail ON contact_links(thumbnail_url)");
  console.log('✅ Created/verified index on thumbnail_url\n');

  // 3. Seed data ONLY if database is empty
  if (!hasData) {
    console.log('3️⃣ Seeding initial contact data...');
    const seedDataPath = path.join(__dirname, '..', 'cms', 'db', 'migrations', '034_seed_contact_data.sql');
    if (fs.existsSync(seedDataPath)) {
      const seedDataSql = fs.readFileSync(seedDataPath, 'utf-8');
      db.exec(seedDataSql);
      console.log('✅ Data seeded\n');
    }
  } else {
    console.log('3️⃣ Skipping seed - preserving your existing data ✅\n');
  }

  // Verify
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM contact_settings').get();
  const linksCount = db.prepare('SELECT COUNT(*) as count FROM contact_links').get();
  console.log(`✅ Migration complete!`);
  console.log(`   Settings: ${settingsCount.count} record(s)`);
  console.log(`   Links: ${linksCount.count} record(s)`);

  db.close();

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
