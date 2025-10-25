// concerts-admin/scripts/migrate-movements.js
// Script per applicare la migrazione movements al database principale

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '../../cms/db/main.sqlite');
const MIGRATION_FILE = path.resolve(__dirname, '../migrations/001_add_movements.sql');

async function runMigration() {
  console.log('🚀 Inizio migrazione movements...\n');
  
  // Controlla se il DB esiste
  try {
    await fs.access(DB_PATH);
    console.log(`✅ Database trovato: ${DB_PATH}`);
  } catch (error) {
    console.error(`❌ Database non trovato: ${DB_PATH}`);
    process.exit(1);
  }
  
  // Apri connessione database
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  
  try {
    // Backup del database
    console.log('\n📦 Creazione backup...');
    const backupPath = `${DB_PATH}.backup-${Date.now()}`;
    await fs.copyFile(DB_PATH, backupPath);
    console.log(`✅ Backup creato: ${backupPath}`);
    
    // Controlla se movements esiste già
    console.log('\n🔍 Verifica tabelle esistenti...');
    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='movements'"
    );
    
    if (tableExists) {
      console.log('⚠️  Tabella movements già esistente, skip migrazione');
      await db.close();
      return;
    }
    
    // Leggi SQL migrazione
    console.log('\n📄 Lettura file migrazione...');
    const migrationSQL = await fs.readFile(MIGRATION_FILE, 'utf-8');
    console.log(`✅ File letto: ${MIGRATION_FILE}`);
    
    // Esegui migrazione
    console.log('\n⚙️  Esecuzione migrazione...');
    await db.exec(migrationSQL);
    console.log('✅ Migrazione eseguita con successo!');
    
    // Verifica tabelle create
    console.log('\n🔍 Verifica tabelle create...');
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('movements', 'concert_program_items')"
    );
    
    console.log('\n📊 Tabelle create:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.name}`);
    });
    
    // Mostra schema movements
    console.log('\n📋 Schema tabella movements:');
    const schema = await db.get(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='movements'"
    );
    console.log(schema.sql);
    
    // Chiudi connessione
    await db.close();
    
    console.log('\n✨ Migrazione completata con successo!\n');
    console.log('📝 Prossimi passi:');
    console.log('   1. Riavvia il server concerts-admin');
    console.log('   2. Testa la creazione di movimenti');
    console.log('   3. Se tutto ok, puoi eliminare il backup\n');
    
  } catch (error) {
    console.error('\n❌ Errore durante la migrazione:', error);
    console.error('\n🔄 Il backup è disponibile, ripristinalo se necessario');
    await db.close();
    process.exit(1);
  }
}

// Esegui migrazione
runMigration().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});