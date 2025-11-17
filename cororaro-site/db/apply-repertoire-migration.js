#!/usr/bin/env node

/**
 * Apply repertoire simplification migration
 * Run this script to add lyrics_original and lyrics_italian columns
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../cororaro.db');
const migrationPath = path.join(__dirname, 'migration-repertoire-simplify.sql');

console.log('🔄 Applying repertoire migration...');
console.log('Database:', dbPath);

const db = new sqlite3.Database(dbPath);

// Read migration SQL
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split by semicolons and filter out empty statements
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute`);

// Execute each statement
db.serialize(() => {
  statements.forEach((sql, index) => {
    db.run(sql, (err) => {
      if (err) {
        // Ignore "duplicate column" errors if migration was already applied
        if (err.message.includes('duplicate column')) {
          console.log(`⚠️  Statement ${index + 1}: Column already exists (skipping)`);
        } else {
          console.error(`❌ Error in statement ${index + 1}:`, err.message);
          console.error('SQL:', sql.substring(0, 100) + '...');
        }
      } else {
        console.log(`✅ Statement ${index + 1} executed successfully`);
      }
    });
  });

  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err);
    } else {
      console.log('✅ Migration completed!');
      console.log('📝 Note: Old columns (difficulty, duration_seconds, sheet_music_url, sort_order, lyrics) are preserved for data safety.');
    }
  });
});
