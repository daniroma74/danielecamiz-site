// Initialize content tables (including concerts)
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../cororaro-site/db/cororaro.db');
const contentSqlPath = join(__dirname, '../cororaro-site/db/migrations/003_create_content_tables.sql');

console.log(`📂 Database: ${dbPath}`);
console.log(`📄 SQL File: ${contentSqlPath}`);

const db = new Database(dbPath);

try {
  // Read content SQL
  const contentSql = fs.readFileSync(contentSqlPath, 'utf-8');

  console.log('📊 Creating content tables...');

  // Execute the SQL - use exec for multiple statements
  db.exec(contentSql);

  console.log('✅ Content tables created successfully!');

  // Verify concerts table
  const concerts = db.prepare('SELECT id, title, date FROM concerts LIMIT 5').all();
  console.log(`\n📋 Sample concerts (${concerts.length} found):`);
  concerts.forEach(c => {
    console.log(`  ${c.id}: "${c.title}" on ${c.date}`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
