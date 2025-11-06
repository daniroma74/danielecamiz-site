#!/usr/bin/env node
// Migration script: Add group_title field to contact_links table
// Allows grouping links under titles (like Linktree)

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');

console.log('🔧 Migration: Add group_title to contact_links');
console.log('Database:', dbPath);
console.log('');

try {
  const db = new Database(dbPath);

  // Check if column already exists
  const tableInfo = db.prepare('PRAGMA table_info(contact_links)').all();
  const hasGroupTitle = tableInfo.some(col => col.name === 'group_title');

  if (hasGroupTitle) {
    console.log('✅ Column group_title already exists. Nothing to do.');
    db.close();
    process.exit(0);
  }

  console.log('📝 Adding column group_title to contact_links...');

  // Add the column
  db.prepare(`
    ALTER TABLE contact_links
    ADD COLUMN group_title TEXT DEFAULT NULL
  `).run();

  console.log('✅ Column added successfully!');
  console.log('');
  console.log('Usage:');
  console.log('- Leave group_title NULL for ungrouped links');
  console.log('- Set group_title="Nuovi Album" to group links under that title');
  console.log('- Links with same group_title will be grouped together');
  console.log('');
  console.log('Example:');
  console.log('  UPDATE contact_links SET group_title="🎵 Live Streaming" WHERE id IN (5,6);');
  console.log('  UPDATE contact_links SET group_title="📚 Nuovi Album" WHERE id IN (1,2,3);');
  console.log('');

  // Show current links
  const links = db.prepare(`
    SELECT id, title_it, category, group_title
    FROM contact_links
    WHERE category='highlight'
    ORDER BY order_index
  `).all();

  if (links.length > 0) {
    console.log('Current highlight links:');
    links.forEach(link => {
      console.log(`  ID ${link.id}: ${link.title_it} (group: ${link.group_title || 'none'})`);
    });
  }

  db.close();
  console.log('');
  console.log('🎉 Migration completed successfully!');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
