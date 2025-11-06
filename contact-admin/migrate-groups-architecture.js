#!/usr/bin/env node
// Migration: Proper groups architecture with separate link_groups table
// This replaces the text-based group_title approach with a relational structure

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');

console.log('🔄 Starting groups architecture migration...\n');

const db = new Database(dbPath);

try {
  // Step 1: Check if link_groups table already exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='link_groups'").all();

  if (tables.length === 0) {
    console.log('📦 Creating link_groups table...');

    db.prepare(`
      CREATE TABLE link_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'highlight',
        order_index INTEGER DEFAULT 0,
        visible INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    console.log('✅ link_groups table created');
  } else {
    console.log('✅ link_groups table already exists');
  }

  // Step 2: Check if contact_links has group_id column
  const columnsInfo = db.prepare('PRAGMA table_info(contact_links)').all();
  const hasGroupId = columnsInfo.some(col => col.name === 'group_id');
  const hasGroupTitle = columnsInfo.some(col => col.name === 'group_title');

  if (!hasGroupId) {
    console.log('📦 Adding group_id column to contact_links...');
    db.prepare('ALTER TABLE contact_links ADD COLUMN group_id INTEGER DEFAULT NULL').run();
    console.log('✅ group_id column added');
  } else {
    console.log('✅ group_id column already exists');
  }

  // Step 3: Migrate existing group_title data to proper groups
  if (hasGroupTitle) {
    console.log('\n🔄 Migrating existing group_title data...');

    const linksWithGroups = db.prepare(`
      SELECT DISTINCT group_title
      FROM contact_links
      WHERE group_title IS NOT NULL AND group_title != ''
    `).all();

    if (linksWithGroups.length > 0) {
      console.log(`   Found ${linksWithGroups.length} unique group(s)`);

      linksWithGroups.forEach((row, index) => {
        const groupName = row.group_title;

        // Create group in link_groups table
        const result = db.prepare(`
          INSERT INTO link_groups (name, category, order_index)
          VALUES (?, 'highlight', ?)
        `).run(groupName, index + 1);

        const groupId = result.lastInsertRowid;

        // Update all links with this group_title to use the new group_id
        const updated = db.prepare(`
          UPDATE contact_links
          SET group_id = ?
          WHERE group_title = ?
        `).run(groupId, groupName);

        console.log(`   ✅ Created group "${groupName}" (id: ${groupId}, links: ${updated.changes})`);
      });

      console.log('✅ Migration completed');
    } else {
      console.log('   No existing groups to migrate');
    }
  }

  // Step 4: Show summary
  console.log('\n📊 Database Summary:');
  const groupsCount = db.prepare('SELECT COUNT(*) as count FROM link_groups').get();
  const linksInGroups = db.prepare('SELECT COUNT(*) as count FROM contact_links WHERE group_id IS NOT NULL').get();

  console.log(`   Groups: ${groupsCount.count}`);
  console.log(`   Links in groups: ${linksInGroups.count}`);

  const groups = db.prepare('SELECT * FROM link_groups ORDER BY order_index').all();
  if (groups.length > 0) {
    console.log('\n   Existing groups:');
    groups.forEach(g => {
      const linkCount = db.prepare('SELECT COUNT(*) as count FROM contact_links WHERE group_id = ?').get(g.id);
      console.log(`   - "${g.name}" (${linkCount.count} links)`);
    });
  }

  console.log('\n✅ Groups architecture migration completed successfully!');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
