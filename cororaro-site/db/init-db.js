#!/usr/bin/env node
/**
 * Coro Raro - Database Initialization Script
 * Creates SQLite database and populates with initial data
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'cororaro.db');
const SQL_FILE = path.join(__dirname, 'init-repertoire.sql');

console.log('🎵 Coro Raro - Database Initialization\n');

// Read SQL file
if (!fs.existsSync(SQL_FILE)) {
  console.error(`❌ SQL file not found: ${SQL_FILE}`);
  process.exit(1);
}

const sql = fs.readFileSync(SQL_FILE, 'utf8');

// Create database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log(`✅ Database connected: ${DB_PATH}`);
});

// Execute SQL
db.exec(sql, (err) => {
  if (err) {
    console.error('❌ Error executing SQL:', err.message);
    db.close();
    process.exit(1);
  }

  console.log('✅ Tables created successfully');

  // Verify data
  db.get('SELECT COUNT(*) as count FROM countries', (err, row) => {
    if (err) {
      console.error('❌ Error counting countries:', err.message);
    } else {
      console.log(`✅ Countries inserted: ${row.count}`);
    }
  });

  db.get('SELECT COUNT(*) as count FROM repertoire', (err, row) => {
    if (err) {
      console.error('❌ Error counting repertoire:', err.message);
    } else {
      console.log(`✅ Repertoire songs inserted: ${row.count}`);
    }

    // Close database
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('\n✅ Database initialization complete!');
        console.log(`📁 Database location: ${DB_PATH}\n`);
      }
    });
  });
});
