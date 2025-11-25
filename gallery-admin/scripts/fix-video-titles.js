// Fix HTML entities in video titles
import { decode } from 'html-entities';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../cms/db/main.sqlite');

const db = new Database(dbPath);

// Get all videos with titles that might contain HTML entities
const videos = db.prepare(`
  SELECT id, title_it, title_en
  FROM gallery_items
  WHERE item_type = 'video' AND (title_it LIKE '%&%' OR title_en LIKE '%&%')
`).all();

console.log('🔍 Found', videos.length, 'videos with HTML entities\n');

let updated = 0;
for (const video of videos) {
  const decodedIt = decode(video.title_it || '');
  const decodedEn = decode(video.title_en || '');

  if (decodedIt !== video.title_it || decodedEn !== video.title_en) {
    db.prepare(`
      UPDATE gallery_items
      SET title_it = ?, title_en = ?
      WHERE id = ?
    `).run(decodedIt, decodedEn, video.id);

    console.log('✅ Updated ID', video.id);
    console.log('   Before:', video.title_it);
    console.log('   After:', decodedIt);
    console.log('');
    updated++;
  }
}

db.close();
console.log('📊 Updated', updated, 'video titles');
