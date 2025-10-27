import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runQuery, getQuery } from '../utils/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '..', '..', 'cms', 'data', 'i18n');

async function migrateBio() {
  console.log('📦 Migrating bio data from JSON to database...\n');

  const langs = ['it', 'en'];
  const sections = ['biography', 'curriculum', 'story'];

  for (const lang of langs) {
    const bioPath = path.join(DATA_PATH, `bio-${lang}.json`);

    if (!fs.existsSync(bioPath)) {
      console.log(`⚠️  bio-${lang}.json not found, skipping`);
      continue;
    }

    const bioData = JSON.parse(fs.readFileSync(bioPath, 'utf-8'));
    console.log(`📄 Processing bio-${lang}.json...`);

    // Biography
    if (bioData.biography) {
      const existing = await getQuery('SELECT id FROM bio_content WHERE section = ? AND lang = ?', ['biography', lang]);

      if (existing) {
        console.log(`  ⏭️  Biography (${lang}) already exists, skipping`);
      } else {
        await runQuery(`
          INSERT INTO bio_content (section, lang, title, intro, content)
          VALUES (?, ?, ?, ?, ?)
        `, [
          'biography',
          lang,
          bioData.biography.title || '',
          bioData.biography.intro || '',
          bioData.biography.more ? bioData.biography.more.join('\n\n') : ''
        ]);
        console.log(`  ✅ Migrated biography (${lang})`);
      }
    }

    // Curriculum
    if (bioData.curriculum) {
      const existing = await getQuery('SELECT id FROM bio_content WHERE section = ? AND lang = ?', ['curriculum', lang]);

      if (existing) {
        console.log(`  ⏭️  Curriculum (${lang}) already exists, skipping`);
      } else {
        await runQuery(`
          INSERT INTO bio_content (section, lang, title, short_text, long_text)
          VALUES (?, ?, ?, ?, ?)
        `, [
          'curriculum',
          lang,
          bioData.curriculum.title || '',
          bioData.curriculum.shortText || '',
          bioData.curriculum.longText || ''
        ]);
        console.log(`  ✅ Migrated curriculum (${lang})`);
      }
    }

    // Story
    if (bioData.story) {
      const existing = await getQuery('SELECT id FROM bio_content WHERE section = ? AND lang = ?', ['story', lang]);

      if (existing) {
        console.log(`  ⏭️  Story (${lang}) already exists, skipping`);
      } else {
        await runQuery(`
          INSERT INTO bio_content (section, lang, title, intro, content)
          VALUES (?, ?, ?, ?, ?)
        `, [
          'story',
          lang,
          bioData.story.title || '',
          bioData.story.intro || '',
          bioData.story.content || ''
        ]);
        console.log(`  ✅ Migrated story (${lang})`);
      }
    }
  }

  console.log('\n✅ Bio data migration completed\n');
}

async function main() {
  console.log('🚀 Starting BIO data migration\n');

  try {
    await migrateBio();
    console.log('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
