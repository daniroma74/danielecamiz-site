// newsletter-service/config/database.js
// Database configuration - USA IL DATABASE ESISTENTE main.sqlite

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// USA IL DATABASE ESISTENTE main.sqlite
const dbPath = path.join(__dirname, '../../cms/db/main.sqlite');

// Connect to EXISTING database
export function connectDB() {
  console.log('📁 Connessione a database esistente:', dbPath);
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Database connection error:', err);
      console.error('Path tentato:', dbPath);
      process.exit(1);
    }
    console.log('✅ Connesso a main.sqlite esistente');
  });

  // Verifica/crea SOLO le tabelle newsletter se non esistono
  // NON tocca le altre tabelle già esistenti nel database
  db.serialize(() => {
    console.log('📋 Verifica tabelle newsletter...');
    
    // Newsletter subscribers table
    db.run(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        status TEXT DEFAULT 'active',
        tags TEXT,
        source TEXT DEFAULT 'website',
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        unsubscribed_at DATETIME
      )
    `, (err) => {
      if (err) console.error('Error creating subscribers table:', err);
      else console.log('✓ Tabella newsletter_subscribers pronta');
    });

    // Newsletter campaigns table
    db.run(`
      CREATE TABLE IF NOT EXISTS newsletter_campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        content_json TEXT,
        template_id INTEGER,
        status TEXT DEFAULT 'draft',
        sent_at DATETIME,
        sent_count INTEGER DEFAULT 0,
        open_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating campaigns table:', err);
      else console.log('✓ Tabella newsletter_campaigns pronta');
    });

    // Newsletter templates table
    db.run(`
      CREATE TABLE IF NOT EXISTS newsletter_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        content_json TEXT,
        thumbnail_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating templates table:', err);
      else console.log('✓ Tabella newsletter_templates pronta');
    });

    // Newsletter settings table
    db.run(`
      CREATE TABLE IF NOT EXISTS newsletter_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        sender_name TEXT DEFAULT 'ICNT - I Concerti nel Tempio',
        sender_email TEXT DEFAULT 'news@danielecamiz.com',
        reply_to TEXT DEFAULT 'info@danielecamiz.com',
        footer_text TEXT,
        unsubscribe_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating settings table:', err);
      else console.log('✓ Tabella newsletter_settings pronta');
    });

    // Newsletter logs table (per tracking)
    db.run(`
      CREATE TABLE IF NOT EXISTS newsletter_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER,
        subscriber_id INTEGER,
        event_type TEXT,
        event_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating logs table:', err);
      else console.log('✓ Tabella newsletter_logs pronta');
    });

    console.log('🎉 Tutte le tabelle newsletter verificate/create nel database esistente');
  });

  return db;
}

// Helper functions per query
export function queryDB(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Query error:', err);
        console.error('Query:', query);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export function getOne(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        console.error('Get error:', err);
        console.error('Query:', query);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export function runDB(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        console.error('Run error:', err);
        console.error('Query:', query);
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

export default {
  connectDB,
  queryDB,
  getOne,
  runDB
};