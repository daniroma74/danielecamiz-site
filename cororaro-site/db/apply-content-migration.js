#!/usr/bin/env node
/**
 * Coro Raro - Apply Content Tables Migration
 * Applica migration 003 al database esistente
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'cororaro.db');
const SQL_CONTENT = path.join(__dirname, 'migrations', '003_create_content_tables.sql');

console.log('🎵 Coro Raro - Applying Content Tables Migration\n');

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ Database not found: ${DB_PATH}`);
  console.log('💡 Run "npm run init-db" first to create the database\n');
  process.exit(1);
}

// Check if migration SQL exists
if (!fs.existsSync(SQL_CONTENT)) {
  console.error(`❌ Migration file not found: ${SQL_CONTENT}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(SQL_CONTENT, 'utf8');

// Open database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log(`✅ Database connected: ${DB_PATH}`);
});

// Execute migration
db.exec(sqlContent, (err) => {
  if (err) {
    console.error('❌ Error executing migration:', err.message);
    db.close();
    process.exit(1);
  }

  console.log('✅ Content tables created successfully!');

  // Verify tables
  db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name IN
    ('site_settings', 'team_members', 'core_values', 'concerts', 'solidarity_projects', 'gallery_images', 'join_info')`,
    (err, rows) => {
      if (err) {
        console.error('❌ Error verifying tables:', err.message);
      } else {
        console.log(`\n✅ Tables created: ${rows.map(r => r.name).join(', ')}`);
      }

      // Verify data
      db.get('SELECT COUNT(*) as count FROM site_settings', (err, row) => {
        if (err) {
          console.error('❌ Error counting settings:', err.message);
        } else {
          console.log(`✅ Site settings inserted: ${row.count}`);
        }

        db.get('SELECT COUNT(*) as count FROM team_members', (err, row) => {
          if (err) {
            console.error('❌ Error counting team members:', err.message);
          } else {
            console.log(`✅ Team members inserted: ${row.count}`);
          }

          db.get('SELECT COUNT(*) as count FROM concerts', (err, row) => {
            if (err) {
              console.error('❌ Error counting concerts:', err.message);
            } else {
              console.log(`✅ Concerts inserted: ${row.count}`);
            }

            // Close database
            db.close((err) => {
              if (err) {
                console.error('❌ Error closing database:', err.message);
              } else {
                console.log('\n✅ Migration complete!');
                console.log('🚀 You can now manage all site content from the admin panel\n');
              }
            });
          });
        });
      });
    }
  );
});
