// Migration runner - Add slug column to concerts table
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database is in cororaro-site
const dbPath = join(__dirname, '../cororaro-site/db/cororaro.db');
const migrationPath = join(__dirname, '../cororaro-site/db/migrations/add_slug_to_concerts.sql');

const db = new Database(dbPath);

console.log('📊 Running migration: add_slug_to_concerts.sql');
console.log(`📂 Database: ${dbPath}`);

try {
  // Read migration file
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  db.transaction(() => {
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 60)}...`);
        db.exec(statement);
      }
    }
  })();

  console.log('✅ Migration completed successfully!');

  // Verify - show some concerts with slugs
  const concerts = db.prepare('SELECT id, title, slug FROM concerts LIMIT 5').all();
  console.log('\n📋 Sample concerts with slugs:');
  concerts.forEach(c => {
    console.log(`  ${c.id}: "${c.title}" → slug: "${c.slug}"`);
  });

  // Count total concerts
  const count = db.prepare('SELECT COUNT(*) as total FROM concerts').get();
  console.log(`\n📊 Total concerts with slugs: ${count.total}`);

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
