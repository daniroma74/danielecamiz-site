#!/usr/bin/env node
// Debug script - check visible state and thumbnail issues
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');

console.log('🔍 DEBUG: Toggle Visibility & Thumbnail Issues\n');
console.log(`Database: ${dbPath}\n`);

// Open without pragma to avoid corruption errors
const db = new Database(dbPath, { readonly: true });

console.log('=' .repeat(60));
console.log('1️⃣ VISIBLE FIELD STATE');
console.log('='.repeat(60) + '\n');

const links = db.prepare(`
  SELECT id, title_it, url, visible, category, thumbnail_url
  FROM contact_links
  ORDER BY category, order_index
  LIMIT 20
`).all();

let visibleCount = 0;
let hiddenCount = 0;

links.forEach(link => {
  const visibleIcon = link.visible === 1 ? '✅ ON ' : '❌ OFF';
  const hasThumb = link.thumbnail_url ? '🖼️' : '  ';

  console.log(`${visibleIcon} ${hasThumb} [${link.category}] ${link.title_it.substring(0, 35)}`);
  console.log(`          URL: ${link.url.substring(0, 60)}`);
  if (link.thumbnail_url) {
    console.log(`          Thumb: ${link.thumbnail_url.substring(0, 60)}`);
  }
  console.log('');

  if (link.visible === 1) visibleCount++;
  else hiddenCount++;
});

console.log('\n' + '='.repeat(60));
console.log('2️⃣ SUMMARY');
console.log('='.repeat(60));
console.log(`\n✅ Visible links: ${visibleCount}`);
console.log(`❌ Hidden links: ${hiddenCount}`);
console.log(`🖼️  Links with thumbnail_url: ${links.filter(l => l.thumbnail_url).length}`);

// Check for YouTube links
const youtubeLinks = links.filter(l =>
  l.url && (l.url.includes('youtube.com') || l.url.includes('youtu.be'))
);

console.log(`📹 YouTube links found: ${youtubeLinks.length}`);

if (youtubeLinks.length > 0) {
  console.log('\n' + '='.repeat(60));
  console.log('3️⃣ YOUTUBE LINKS DETAIL');
  console.log('='.repeat(60) + '\n');

  youtubeLinks.forEach(link => {
    console.log(`📹 ${link.title_it}`);
    console.log(`   URL: ${link.url}`);
    console.log(`   Has thumbnail_url in DB: ${link.thumbnail_url ? 'YES' : 'NO'}`);
    console.log(`   Stored thumbnail: ${link.thumbnail_url || 'null'}`);

    // Extract video ID
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];

    let videoId = null;
    for (const pattern of patterns) {
      const match = link.url.match(pattern);
      if (match && match[1]) {
        videoId = match[1];
        break;
      }
    }

    if (videoId) {
      const expectedThumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      console.log(`   Expected thumbnail: ${expectedThumb}`);
      console.log(`   Match: ${link.thumbnail_url === expectedThumb ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`   ⚠️  Could not extract video ID from URL`);
    }
    console.log('');
  });
}

console.log('\n' + '='.repeat(60));
console.log('4️⃣ DIAGNOSIS');
console.log('='.repeat(60) + '\n');

// Toggle diagnosis
if (visibleCount === links.length) {
  console.log('⚠️  ALL links are visible=1');
  console.log('   → Toggle state not being saved correctly');
  console.log('   → Check editor save logic\n');
} else if (hiddenCount === links.length) {
  console.log('⚠️  ALL links are visible=0');
  console.log('   → Something is setting all links to hidden');
  console.log('   → Check migrations or seed data\n');
} else {
  console.log('✅ Mixed visible states detected (good sign)');
  console.log('   → Toggle values ARE being saved');
  console.log('   → Problem might be in how editor loads/displays state\n');
}

// Thumbnail diagnosis
const thumbCount = links.filter(l => l.thumbnail_url).length;
if (thumbCount === 0 && youtubeLinks.length > 0) {
  console.log('⚠️  YouTube links found but NO thumbnails in DB');
  console.log('   → Auto-extraction not working OR');
  console.log('   → Client-side extraction should handle it\n');
} else if (thumbCount > 0) {
  console.log('✅ Some thumbnails stored in DB');
  console.log('   → If not visible, check CSS or image loading\n');
}

console.log('='.repeat(60));
console.log('5️⃣ NEXT STEPS');
console.log('='.repeat(60) + '\n');

console.log('For Toggle Issues:');
console.log('  1. Open browser console on /editor/visual');
console.log('  2. Check what data is loaded: window.app.$data.links');
console.log('  3. Toggle a switch and check if visible changes');
console.log('  4. Save and check network tab for PUT /editor/link/:id\n');

console.log('For Thumbnail Issues:');
console.log('  1. Open browser console on contact site');
console.log('  2. Check if thumbnails are in HTML (inspect highlight cards)');
console.log('  3. Check if images fail to load (404 errors in Network tab)');
console.log('  4. Check CSS for .highlight-thumbnail class\n');

db.close();
