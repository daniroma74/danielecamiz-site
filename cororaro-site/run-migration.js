// Migration runner - Add slug column to concerts table
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'db', 'cororaro.db');
const db = new Database(dbPath);

console.log('📊 Running migration: add_slug_to_concerts.sql');

try {
  // Read migration file
  const migrationPath = join(__dirname, 'db', 'migrations', 'add_slug_to_concerts.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  db.transaction(() => {
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
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

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
