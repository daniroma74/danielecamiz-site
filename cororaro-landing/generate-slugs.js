// Generate slugs for existing concerts using JavaScript
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../cororaro-site/db/cororaro.db');
const db = new Database(dbPath);

console.log('📊 Generating slugs for concerts\n');

// Helper function to create slug from title
function createSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')  // Normalize unicode
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/'/g, '') // Remove apostrophes
    .replace(/"/g, '') // Remove quotes
    .replace(/\./g, '') // Remove dots
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
}

try {
  // Get all concerts
  const concerts = db.prepare('SELECT id, title FROM concerts WHERE slug IS NULL').all();

  console.log(`Found ${concerts.length} concerts without slugs\n`);

  const slugCounts = {};
  const updateStmt = db.prepare('UPDATE concerts SET slug = ? WHERE id = ?');

  for (const concert of concerts) {
    let slug = createSlug(concert.title);

    // Handle duplicates
    if (slugCounts[slug]) {
      slugCounts[slug]++;
      slug = `${slug}-${slugCounts[slug]}`;
    } else {
      slugCounts[slug] = 1;
    }

    updateStmt.run(slug, concert.id);
    console.log(`✅ ${concert.id}: "${concert.title}" → "${slug}"`);
  }

  console.log('\n📋 Final result:');
  const allConcerts = db.prepare('SELECT id, title, slug FROM concerts').all();
  allConcerts.forEach(c => {
    console.log(`  ${c.id}: "${c.title}" → "${c.slug}"`);
  });

  console.log('\n✅ Slugs generated successfully!');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
