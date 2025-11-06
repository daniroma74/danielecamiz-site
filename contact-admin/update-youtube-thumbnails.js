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

try {
  console.log('🔄 Updating YouTube thumbnails for existing links...\n');

  // Get all links
  const links = db.prepare('SELECT id, url, thumbnail_url FROM contact_links').all();

  let updatedCount = 0;

  links.forEach(link => {
    // Skip if thumbnail already set
    if (link.thumbnail_url) {
      return;
    }

    // Check if URL is YouTube
    const videoId = extractYouTubeId(link.url);
    if (videoId) {
      const thumbnail = getYouTubeThumbnail(videoId);
      console.log(`📹 Link ID ${link.id}: ${link.url}`);
      console.log(`   → Thumbnail: ${thumbnail}\n`);

      db.prepare('UPDATE contact_links SET thumbnail_url = ? WHERE id = ?')
        .run(thumbnail, link.id);

      updatedCount++;
    }
  });

  console.log(`✅ Updated ${updatedCount} YouTube link(s) with thumbnails.`);

} catch (error) {
  console.error('❌ Update failed:', error.message);
  process.exit(1);
}
