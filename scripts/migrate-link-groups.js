#!/usr/bin/env node

/**
 * Migration Script: Add link_groups table
 *
 * This script applies migration 035_add_link_groups.sql to the database
 * It adds the link_groups table and group_id column to contact_links
 *
 * Usage: node scripts/migrate-link-groups.js
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');
const MIGRATION_PATH = path.join(__dirname, '..', 'cms', 'db', 'migrations', '035_add_link_groups.sql');

console.log('🔧 Link Groups Migration Script');
console.log('================================\n');

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found at:', DB_PATH);
  process.exit(1);
}

// Check if migration file exists
if (!fs.existsSync(MIGRATION_PATH)) {
  console.error('❌ Migration file not found at:', MIGRATION_PATH);
  process.exit(1);
}

try {
  // Open database
  console.log('📂 Opening database:', DB_PATH);
  const db = new Database(DB_PATH);

  // Check if link_groups table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='link_groups'
  `).get();

  if (tableExists) {
    console.log('⚠️  link_groups table already exists. Migration may have been applied.');
    console.log('   Continuing anyway to ensure all changes are applied...\n');
  }

  // Read migration SQL
  console.log('📄 Reading migration file...');
  const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Split by semicolon and execute each statement
  console.log('⚙️  Executing migration...\n');
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let skipCount = 0;

  for (const statement of statements) {
    try {
      db.exec(statement);
      successCount++;
      console.log('✓ Executed statement');
    } catch (error) {
      // Some statements might fail if already applied (like INSERT with duplicate)
      // or if column already exists - this is OK
      if (error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.message.includes('UNIQUE constraint')) {
        skipCount++;
        console.log('⊘ Skipped (already applied)');
      } else {
        console.error('✗ Error:', error.message);
        throw error;
      }
    }
  }

  console.log('\n✅ Migration completed successfully!');
  console.log(`   ${successCount} statement(s) executed`);
  if (skipCount > 0) {
    console.log(`   ${skipCount} statement(s) skipped (already applied)`);
  }

  // Verify the migration
  console.log('\n🔍 Verifying migration...');

  const linkGroupsTable = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='link_groups'
  `).get();

  const groupIdColumn = db.prepare(`
    PRAGMA table_info(contact_links)
  `).all().find(col => col.name === 'group_id');

  if (linkGroupsTable) {
    console.log('✓ link_groups table exists');
  } else {
    console.error('✗ link_groups table NOT found');
  }

  if (groupIdColumn) {
    console.log('✓ group_id column exists in contact_links');
  } else {
    console.error('✗ group_id column NOT found in contact_links');
  }

  // Show current groups
  const groups = db.prepare('SELECT * FROM link_groups ORDER BY order_index').all();
  console.log(`\n📊 Current groups in database: ${groups.length}`);
  groups.forEach(group => {
    console.log(`   - ${group.name} (ID: ${group.id}, visible: ${group.visible}, order: ${group.order_index})`);
  });

  db.close();
  console.log('\n🎉 Migration complete! You can now use the visual editor v3.\n');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
