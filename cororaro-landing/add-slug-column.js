// Add slug column to concerts table - simplified version
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../cororaro-site/db/cororaro.db');
const db = new Database(dbPath);

console.log('📊 Adding slug column to concerts table\n');

try {
  // Step 1: Add slug column
  console.log('Step 1: Adding slug column...');
  db.exec('ALTER TABLE concerts ADD COLUMN slug TEXT');
  console.log('✅ Slug column added');

  // Step 2: Create unique index
  console.log('\nStep 2: Creating unique index on slug...');
  db.exec('CREATE UNIQUE INDEX idx_concerts_slug ON concerts(slug)');
  console.log('✅ Index created');

  // Step 3: Generate slugs for existing concerts
  console.log('\nStep 3: Generating slugs from titles...');
  const updateSlugStmt = db.prepare(`
    UPDATE concerts
    SET slug = LOWER(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(title, ' ', '-'),
          "'", ''),
        '"', ''),
      '.', '')
    )
    WHERE slug IS NULL
  `);
  const result = updateSlugStmt.run();
  console.log(`✅ Generated slugs for ${result.changes} concerts`);

  // Step 4: Handle duplicates
  console.log('\nStep 4: Handling duplicate slugs...');

  // Get all concerts ordered by id
  const concerts = db.prepare('SELECT id, slug FROM concerts ORDER BY id').all();
  const slugCounts = {};

  for (const concert of concerts) {
    const baseSlug = concert.slug;

    if (!slugCounts[baseSlug]) {
      slugCounts[baseSlug] = 1;
    } else {
      // This is a duplicate - append counter
      slugCounts[baseSlug]++;
      const newSlug = `${baseSlug}-${slugCounts[baseSlug]}`;
      db.prepare('UPDATE concerts SET slug = ? WHERE id = ?').run(newSlug, concert.id);
      console.log(`  Fixed duplicate: "${baseSlug}" → "${newSlug}" for concert ${concert.id}`);
    }
  }

  console.log('✅ Duplicates handled');

  // Verify
  console.log('\n📋 Final result:');
  const allConcerts = db.prepare('SELECT id, title, slug FROM concerts').all();
  allConcerts.forEach(c => {
    console.log(`  ${c.id}: "${c.title}" → slug: "${c.slug}"`);
  });

  console.log('\n✅ Migration completed successfully!');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
