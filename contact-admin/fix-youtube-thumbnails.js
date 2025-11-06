#!/usr/bin/env node
// Script to fix YouTube thumbnails for existing links
// Run this once to update all existing YouTube links with thumbnails

import { db } from './config/database.js';

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
function extractYouTubeId(url) {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate YouTube thumbnail URL from video ID
 */
function getYouTubeThumbnail(videoId) {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

console.log('🔄 Fixing YouTube thumbnails for existing links...\n');

try {
  // Get all links
  const links = db.prepare('SELECT id, url, thumbnail_url FROM contact_links').all();

  console.log(`📊 Found ${links.length} total links\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  const updateStmt = db.prepare('UPDATE contact_links SET thumbnail_url = ? WHERE id = ?');

  links.forEach(link => {
    // Check if URL is YouTube
    const videoId = extractYouTubeId(link.url);

    if (!videoId) {
      // Not a YouTube link, skip
      return;
    }

    // Skip if thumbnail already set
    if (link.thumbnail_url && link.thumbnail_url.trim()) {
      console.log(`⏭️  Link ID ${link.id}: Already has thumbnail`);
      skippedCount++;
      return;
    }

    const thumbnail = getYouTubeThumbnail(videoId);
    console.log(`📹 Link ID ${link.id}:`);
    console.log(`   URL: ${link.url}`);
    console.log(`   Thumbnail: ${thumbnail}`);

    updateStmt.run(thumbnail, link.id);
    updatedCount++;
    console.log('   ✅ Updated\n');
  });

  console.log('━'.repeat(60));
  console.log(`✅ Complete!`);
  console.log(`   Updated: ${updatedCount} link(s)`);
  console.log(`   Skipped: ${skippedCount} link(s) (already had thumbnails)`);
  console.log(`   Total YouTube links: ${updatedCount + skippedCount}`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
