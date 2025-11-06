import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'main.sqlite');
const migrationPath = process.argv[2];

if (!migrationPath) {
  console.error('Usage: node run-migration.js <migration-file.sql>');
  process.exit(1);
}

try {
  const db = new Database(dbPath);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolon and execute each statement
  const statements = sql.split(';').filter(s => s.trim());

  statements.forEach(stmt => {
    if (stmt.trim()) {
      db.exec(stmt);
    }
  });

  console.log(`✅ Migration executed: ${path.basename(migrationPath)}`);
  db.close();
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
