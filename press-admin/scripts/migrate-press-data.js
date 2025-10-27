import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runQuery, getDb } from '../utils/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '..', '..', 'cms', 'data', 'i18n');

async function migrateQuotes() {
  console.log('📦 Migrating quotes from JSON to database...');

  const pressItPath = path.join(DATA_PATH, 'press-it.json');
  const pressEnPath = path.join(DATA_PATH, 'press-en.json');

  if (!fs.existsSync(pressItPath)) {
    console.log('⚠️  press-it.json not found, skipping quotes migration');
    return;
  }

  const pressIt = JSON.parse(fs.readFileSync(pressItPath, 'utf-8'));
  const pressEn = fs.existsSync(pressEnPath)
    ? JSON.parse(fs.readFileSync(pressEnPath, 'utf-8'))
    : null;

  if (!pressIt.press || !Array.isArray(pressIt.press)) {
    console.log('⚠️  No quotes found in press-it.json');
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (let i = 0; i < pressIt.press.length; i++) {
    const quoteIt = pressIt.press[i];
    const quoteEn = pressEn?.press?.[i];

    if (!quoteIt.quote) {
      console.log(`⚠️  Skipping quote ${i}: no quote text`);
      skipped++;
      continue;
    }

    try {
      const existingCheck = await new Promise((resolve, reject) => {
        const db = getDb();
        db.get(
          'SELECT id FROM press_quotes WHERE quote_it = ? AND source = ?',
          [quoteIt.quote, quoteIt.source],
          (err, row) => {
            db.close();
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingCheck) {
        console.log(`⏭️  Quote from ${quoteIt.source} already exists, skipping`);
        skipped++;
        continue;
      }

      await runQuery(`
        INSERT INTO press_quotes (
          quote_it, quote_en, source, source_role_it, source_role_en,
          published_date, url, is_published, is_featured, display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [
        quoteIt.quote || '',
        quoteEn?.quote || null,
        quoteIt.source || 'Unknown',
        quoteIt.author || null,
        quoteEn?.author || null,
        null,
        quoteIt.link || null,
        quoteIt.interview ? 1 : 0,
        i
      ]);

      console.log(`✅ Migrated quote from ${quoteIt.source}`);
      migrated++;
    } catch (error) {
      console.error(`❌ Error migrating quote ${i}:`, error.message);
    }
  }

  console.log(`\n📊 Migration complete: ${migrated} quotes migrated, ${skipped} skipped\n`);
}

async function main() {
  console.log('🚀 Starting PRESS data migration\n');

  try {
    await migrateQuotes();
    console.log('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
