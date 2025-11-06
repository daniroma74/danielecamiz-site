#!/usr/bin/env node
// Database repair using better-sqlite3 (already installed!)
// NO external dependencies needed - uses what's already in the project

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');

console.log('🔧 DATABASE REPAIR with better-sqlite3\n');
console.log(`Database: ${dbPath}\n`);

// Step 0: Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found!');
  process.exit(1);
}

// Step 1: Full backup
const timestamp = Date.now();
const backupPath = dbPath + '.backup-' + timestamp;

try {
  console.log('📦 Creating full backup...');
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ Backup: ${path.basename(backupPath)}\n`);
} catch (e) {
  console.error('❌ Backup failed:', e.message);
  process.exit(1);
}

// Step 2: Try to open and diagnose
console.log('🔍 Attempting to open database...\n');

let db;
let canOpen = false;
let integrityOk = false;

try {
  db = new Database(dbPath, { readonly: true });
  canOpen = true;
  console.log('✅ Database opened successfully');

  // Try integrity check
  try {
    const result = db.pragma('integrity_check');
    if (result && result[0] && result[0].integrity_check === 'ok') {
      integrityOk = true;
      console.log('✅ Integrity check: OK\n');
    } else {
      console.log('❌ Integrity check: FAILED');
      console.log(result);
    }
  } catch (e) {
    console.log('❌ Integrity check failed:', e.message);
  }

  db.close();
} catch (e) {
  console.log('❌ Cannot open database:', e.message);
  console.log('   Error code:', e.code);
}

console.log('\n' + '='.repeat(60));

// Step 3: Analyze and recommend
if (integrityOk) {
  console.log('🎉 GOOD NEWS: Database appears healthy!\n');
  console.log('The corruption error might be intermittent or resolved.');
  console.log('Try restarting the services:\n');
  console.log('    pm2 restart contact-admin contact-site\n');
  console.log('If errors persist, the issue might be:');
  console.log('- Lock contention (multiple processes writing)');
  console.log('- WAL file corruption (try deleting .wal and .shm files)');
  console.log('- Permissions issue');

} else if (canOpen) {
  console.log('⚠️  DATABASE HAS INTEGRITY ISSUES\n');

  console.log('Attempting data extraction...\n');

  try {
    const db2 = new Database(dbPath, { readonly: true });

    // Try to count records in key tables
    const tables = ['contact_settings', 'contact_links', 'contact_sections'];

    let recoverable = true;
    for (const table of tables) {
      try {
        const count = db2.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        console.log(`✅ ${table}: ${count.count} records`);
      } catch (e) {
        console.log(`❌ ${table}: Cannot read - ${e.message}`);
        recoverable = false;
      }
    }

    db2.close();

    if (recoverable) {
      console.log('\n✅ Data appears recoverable!\n');
      console.log('Option 1: Export and recreate (SAFEST for contact tables)');
      console.log('    node contact-admin/export-and-rebuild-contact.js\n');

      console.log('Option 2: Try WAL recovery');
      console.log('    cd cms/db');
      console.log('    rm main.sqlite-wal main.sqlite-shm');
      console.log('    pm2 restart contact-admin contact-site\n');
    } else {
      console.log('\n❌ Some tables are corrupted\n');
      recommendRecoveryOptions();
    }

  } catch (e) {
    console.log('❌ Data extraction failed:', e.message);
    recommendRecoveryOptions();
  }

} else {
  console.log('❌ SEVERE CORRUPTION - Cannot open database\n');
  recommendRecoveryOptions();
}

function recommendRecoveryOptions() {
  console.log('🔧 RECOVERY OPTIONS:\n');

  console.log('Option 1: Restore from backup (Recommended if you have recent backup)');
  const dbDir = path.dirname(dbPath);
  const backups = fs.readdirSync(dbDir)
    .filter(f => f.startsWith('main.sqlite.backup'))
    .sort()
    .reverse()
    .slice(0, 5);

  if (backups.length > 0) {
    console.log('   Available backups:');
    backups.forEach(backup => {
      const stats = fs.statSync(path.join(dbDir, backup));
      const age = ((Date.now() - stats.mtime) / 1000 / 60 / 60).toFixed(1);
      console.log(`   - ${backup} (${age} hours ago)`);
    });
    console.log('\n   To restore:');
    console.log('   cd cms/db');
    console.log('   mv main.sqlite main.sqlite.corrupted');
    console.log(`   cp ${backups[0]} main.sqlite`);
    console.log('   pm2 restart contact-admin contact-site\n');
  } else {
    console.log('   ❌ No backups found\n');
  }

  console.log('Option 2: Use sqlite3 CLI .recover command (Preserves all data)');
  console.log('   cd cms/db');
  console.log('   sqlite3 main.sqlite ".recover" > recovered.sql');
  console.log('   mv main.sqlite main.sqlite.corrupted');
  console.log('   sqlite3 main.sqlite < recovered.sql');
  console.log('   pm2 restart contact-admin contact-site\n');

  console.log('Option 3: Rebuild contact tables only (LOSES other module data!)');
  console.log('   ⚠️  Use only if you don\'t need concerts/gallery/press data!');
  console.log('   node contact-admin/emergency-rebuild-db.js\n');
}

console.log('='.repeat(60));
console.log(`\n✅ Backup saved at: ${backupPath}\n`);
