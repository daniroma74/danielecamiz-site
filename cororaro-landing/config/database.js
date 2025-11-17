import Database from 'better-sqlite3';
import { DB_PATH } from './constants.js';

let db = null;

export function connectDB() {
  if (!db) {
    db = new Database(DB_PATH, { verbose: console.log });
    db.pragma('journal_mode = WAL');
    console.log(`✅ Database connected: ${DB_PATH}`);
  }
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

// Helper functions for async-like queries
export async function getOne(db, query, params = []) {
  return db.prepare(query).get(...params);
}

export async function queryDB(db, query, params = []) {
  return db.prepare(query).all(...params);
}

export async function runDB(db, query, params = []) {
  return db.prepare(query).run(...params);
}
