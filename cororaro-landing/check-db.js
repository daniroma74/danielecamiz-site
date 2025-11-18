// Check database structure
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../cororaro-site/db/cororaro.db');

console.log(`📂 Database: ${dbPath}`);

const db = new Database(dbPath);

try {
  // List all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `).all();

  console.log('\n📊 Tables in database:');
  tables.forEach(t => console.log(`  - ${t.name}`));

  // Check if concerts table exists
  const concertsTable = tables.find(t => t.name === 'concerts');

  if (concertsTable) {
    console.log('\n✅ concerts table exists');

    // Get table schema
    const columns = db.prepare(`PRAGMA table_info(concerts)`).all();
    console.log('\n📋 concerts table columns:');
    columns.forEach(col => {
      console.log(`  ${col.name} (${col.type}${col.notnull ? ', NOT NULL' : ''}${col.pk ? ', PRIMARY KEY' : ''})`);
    });

    // Check if slug exists
    const hasSlug = columns.find(col => col.name === 'slug');
    if (hasSlug) {
      console.log('\n✅ slug column EXISTS!');

      // Show sample data
      const concerts = db.prepare('SELECT id, title, slug FROM concerts LIMIT 5').all();
      console.log('\n📋 Sample concerts:');
      concerts.forEach(c => {
        console.log(`  ${c.id}: "${c.title}" → "${c.slug}"`);
      });
    } else {
      console.log('\n❌ slug column DOES NOT EXIST');
    }

  } else {
    console.log('\n❌ concerts table does NOT exist!');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
