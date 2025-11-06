#!/usr/bin/env node
// Quick DB integrity check
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'cms', 'db', 'main.sqlite');

try {
  console.log('Checking database:', DB_PATH);
  const db = new Database(DB_PATH);

  // Check integrity
  const result = db.prepare('PRAGMA integrity_check').get();
  console.log('\n✅ INTEGRITY CHECK:', result);

  // Check if database is usable
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\n📊 Tables found:', tables.length);
  tables.forEach(t => console.log('  -', t.name));

  // Check concerts table
  try {
    const concertsCount = db.prepare('SELECT COUNT(*) as count FROM concerts').get();
    console.log('\n🎵 Concerts records:', concertsCount.count);
  } catch (e) {
    console.log('\n⚠️  Concerts table error:', e.message);
  }

  db.close();
  console.log('\n✅ Database is accessible');
} catch (error) {
  console.error('\n❌ DATABASE ERROR:', error.message);
  process.exit(1);
}
