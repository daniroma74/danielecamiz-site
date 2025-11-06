#!/usr/bin/env node
// Safe database repair - attempts to fix corruption without losing data
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');

console.log('🔧 SAFE DATABASE REPAIR\n');
console.log(`Database: ${dbPath}\n`);
console.log('⚠️  This script will attempt to repair the database');
console.log('⚠️  WITHOUT deleting any data from other modules\n');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found!');
  process.exit(1);
}

// Step 1: Create backup
const timestamp = Date.now();
const backupPath = dbPath + '.backup-before-repair.' + timestamp;

try {
  console.log('📦 Step 1: Creating full backup...');
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ Backup created: ${path.basename(backupPath)}\n`);
} catch (e) {
  console.error('❌ Backup failed:', e.message);
  process.exit(1);
}

// Step 2: Try SQLite recovery (if sqlite3 is available)
console.log('🔍 Step 2: Checking if sqlite3 is available...');
let hasSqlite3 = false;
try {
  execSync('which sqlite3', { stdio: 'ignore' });
  hasSqlite3 = true;
  console.log('✅ sqlite3 found\n');
} catch (e) {
  console.log('⚠️  sqlite3 not found - will skip advanced recovery\n');
}

if (hasSqlite3) {
  console.log('🔧 Step 3: Attempting SQLite recovery...');
  const recoveredPath = dbPath + '.recovered.' + timestamp;

  try {
    // Use .recover command to extract data from corrupted DB
    const recoverCmd = `echo ".recover" | sqlite3 "${dbPath}" > "${recoveredPath}.sql"`;
    execSync(recoverCmd, { stdio: 'inherit' });

    // Create new DB from recovered SQL
    execSync(`sqlite3 "${recoveredPath}" < "${recoveredPath}.sql"`, { stdio: 'inherit' });

    console.log('✅ Recovery completed\n');
    console.log('📋 Next steps:');
    console.log(`   1. Test the recovered database: ${path.basename(recoveredPath)}`);
    console.log(`   2. If it works, replace the original:`);
    console.log(`      mv "${recoveredPath}" "${dbPath}"`);
    console.log(`   3. Restart services: pm2 restart contact-admin contact-site\n`);

  } catch (e) {
    console.error('❌ Recovery failed:', e.message);
    console.log('⚠️  Will try alternative approach...\n');
  }
}

// Step 3: Check integrity
console.log('🔍 Step 4: Checking database integrity...');
try {
  const integrityCheck = execSync(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`, { encoding: 'utf-8' });

  if (integrityCheck.trim() === 'ok') {
    console.log('✅ Database integrity: OK');
    console.log('⚠️  Strange - DB appears healthy. The corruption might be intermittent.\n');
  } else {
    console.log('❌ Database integrity check failed:');
    console.log(integrityCheck);
  }
} catch (e) {
  console.error('❌ Cannot check integrity (sqlite3 not available)');
}

// Step 4: Manual fix instructions
console.log('\n' + '='.repeat(60));
console.log('📋 MANUAL FIX OPTIONS');
console.log('='.repeat(60));

console.log('\n🔧 Option 1: Use sqlite3 .recover (Recommended)');
console.log('   This preserves ALL data from all modules\n');
console.log('   1. ssh into server');
console.log('   2. cd ~/danielecamiz-site/cms/db');
console.log('   3. sqlite3 main.sqlite');
console.log('   4. .output recovered.sql');
console.log('   5. .recover');
console.log('   6. .exit');
console.log('   7. mv main.sqlite main.sqlite.corrupted');
console.log('   8. sqlite3 main.sqlite < recovered.sql');
console.log('   9. pm2 restart contact-admin contact-site\n');

console.log('🔧 Option 2: Restore from last good backup');
console.log('   Check existing backups:\n');

const dbDir = path.dirname(dbPath);
const backups = fs.readdirSync(dbDir)
  .filter(f => f.startsWith('main.sqlite.backup'))
  .sort()
  .reverse();

if (backups.length > 0) {
  console.log('   Available backups:');
  backups.slice(0, 5).forEach(backup => {
    const stats = fs.statSync(path.join(dbDir, backup));
    console.log(`   - ${backup} (${new Date(stats.mtime).toLocaleString()})`);
  });
  console.log('\n   To restore:');
  console.log('   1. cd ~/danielecamiz-site/cms/db');
  console.log('   2. mv main.sqlite main.sqlite.corrupted');
  console.log('   3. cp [backup-file] main.sqlite');
  console.log('   4. pm2 restart contact-admin contact-site\n');
} else {
  console.log('   ❌ No backups found\n');
}

console.log('🔧 Option 3: Contact-only rebuild (DANGEROUS - LOSES OTHER DATA)');
console.log('   Only use if you don\'t care about concerts, gallery, press data!');
console.log('   node contact-admin/emergency-rebuild-db.js\n');

console.log('='.repeat(60));
console.log('✅ Backup created at:');
console.log(`   ${backupPath}`);
console.log('\n⚠️  Choose an option above and proceed carefully!\n');
