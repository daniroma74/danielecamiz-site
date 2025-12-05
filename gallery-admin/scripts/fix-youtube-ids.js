// gallery-admin/scripts/fix-youtube-ids.js
// Script to clean YouTube IDs in database (remove URLs, keep only IDs)

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../cms/db/main.sqlite');
const db = new Database(dbPath);

function extractYouTubeId(input) {
  if (!input) return '';

  input = String(input).trim();

  // Direct ID (11 characters, alphanumeric + - and _)
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // Extract from various YouTube URL formats
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If it looks like an ID with extra params (e.g., "VIDEO_ID?si=...")
  // Just extract the first 11 valid characters
  const idMatch = input.match(/^([A-Za-z0-9_-]{11})/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  console.warn('❌ Could not extract YouTube ID from:', input);
  return '';
}

console.log('🔍 Searching for videos with invalid YouTube IDs...\n');

const videos = db.prepare(`
  SELECT id, youtube_id, title_it
  FROM gallery_items
  WHERE item_type = 'video'
`).all();

console.log(`Found ${videos.length} videos total\n`);

let fixedCount = 0;
let failedCount = 0;

for (const video of videos) {
  const cleanId = extractYouTubeId(video.youtube_id);

  if (cleanId !== video.youtube_id) {
    if (cleanId) {
      console.log(`📹 "${video.title_it}"`);
      console.log(`   OLD: ${video.youtube_id}`);
      console.log(`   NEW: ${cleanId}`);

      db.prepare(`
        UPDATE gallery_items
        SET youtube_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(cleanId, video.id);

      fixedCount++;
      console.log('   ✅ Fixed\n');
    } else {
      console.log(`❌ "${video.title_it}"`);
      console.log(`   Invalid ID: ${video.youtube_id}`);
      console.log(`   Please fix manually\n`);
      failedCount++;
    }
  }
}

console.log('═══════════════════════════════════════');
console.log(`✅ Fixed: ${fixedCount}`);
console.log(`❌ Failed: ${failedCount}`);
console.log(`📊 Total: ${videos.length}`);
console.log('═══════════════════════════════════════\n');

db.close();
