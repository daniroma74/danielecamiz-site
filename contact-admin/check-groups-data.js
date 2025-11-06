#!/usr/bin/env node
// Quick script to check groups data in database

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');

try {
  const db = new Database(DB_PATH);

  console.log('\n=== LINK GROUPS ===');
  const groups = db.prepare('SELECT * FROM link_groups').all();
  console.log(JSON.stringify(groups, null, 2));

  console.log('\n=== HIGHLIGHT LINKS (with group_id) ===');
  const links = db.prepare(`
    SELECT id, title_it, group_id, visible
    FROM contact_links
    WHERE category='highlight'
    ORDER BY order_index
  `).all();
  console.log(JSON.stringify(links, null, 2));

  console.log('\n=== LINKS WITH group_id NOT NULL ===');
  const groupedLinks = db.prepare(`
    SELECT id, title_it, group_id
    FROM contact_links
    WHERE group_id IS NOT NULL
  `).all();
  console.log(JSON.stringify(groupedLinks, null, 2));

  db.close();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
