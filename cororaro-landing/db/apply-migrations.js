import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, 'migrations');

console.log('🔄 Applying database migrations...\n');

const db = connectDB();

// Read all migration files
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

files.forEach(file => {
  console.log(`📄 Running migration: ${file}`);

  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

  // Execute the entire file as one script (better-sqlite3 supports this)
  try {
    db.exec(sql);
    console.log(`   ✅ Migration applied successfully\n`);
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
      console.error(`   ❌ Error:`, err.message);
    } else {
      console.log(`   ⚠️  Tables already exist, skipping\n`);
    }
  }
});

console.log('✅ All migrations completed!\n');

// Verify tables
console.log('📋 Verifying tables:');
const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table'
  AND name IN ('concert_landing_settings', 'concert_bookings', 'concert_newsletter')
  ORDER BY name
`).all();

tables.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
  console.log(`   ✓ ${t.name} (${count.count} rows)`);
});

db.close();
console.log('\n✅ Database connection closed');
