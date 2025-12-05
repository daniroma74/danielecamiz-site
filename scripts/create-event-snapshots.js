#!/usr/bin/env node
/**
 * Automatic Event Snapshot Creator
 *
 * Runs daily (via cron) to:
 * 1. Find events that just ended (date < today, is_future = 1, no snapshot yet)
 * 2. Create full HTML snapshot of landing page
 * 3. Save to landing_snapshots table
 * 4. Mark event as is_future = 0
 *
 * Usage: node scripts/create-event-snapshots.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, '../cms/db/main.sqlite');
const db = new Database(dbPath);

async function fetchLandingPageHTML(slug) {
  try {
    // ✅ Fetch dalla landing page (porta 3002) con header speciale
    const url = `http://localhost:3002?event=${slug}`;

    console.log(`  📥 Fetching ${url}...`);
    const response = await fetch(url, {
      headers: {
        'X-Snapshot-Request': 'true'  // ✅ Forza routing pubblico
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`  ✅ Fetched ${html.length} bytes`);

    return html;
  } catch (error) {
    console.error(`  ❌ Error fetching ${slug}:`, error.message);
    return null;
  }
}

async function createSnapshot(concert) {
  console.log(`\n📸 Creating snapshot for: ${concert.title}`);
  console.log(`   Date: ${concert.date}`);
  console.log(`   Slug: ${concert.slug}`);

  // 1. Fetch HTML completo
  const html = await fetchLandingPageHTML(concert.slug);
  if (!html) {
    console.error('   ⚠️  Failed to fetch HTML, skipping...');
    return false;
  }

  // 2. Carica landing_settings per custom CSS
  const settings = db.prepare(
    'SELECT custom_css FROM landing_settings WHERE concert_id = ?'
  ).get(concert.id);

  const customCss = settings?.custom_css || null;

  // 3. Crea meta_data JSON
  const metaData = {
    title: concert.title,
    subtitle: concert.subtitle,
    date: concert.date,
    location: concert.location,
    slug: concert.slug,
    snapshot_reason: 'auto_archive',
    original_is_future: concert.is_future
  };

  // 4. Salva snapshot
  try {
    db.prepare(`
      INSERT INTO landing_snapshots
      (concert_id, html_content, custom_css, meta_data)
      VALUES (?, ?, ?, ?)
    `).run(
      concert.id,
      html,
      customCss,
      JSON.stringify(metaData)
    );

    console.log('   ✅ Snapshot saved to database');

    // 5. Aggiorna is_future = 0
    db.prepare('UPDATE concerts SET is_future = 0 WHERE id = ?').run(concert.id);
    console.log('   ✅ Event marked as archived (is_future = 0)');

    return true;
  } catch (error) {
    console.error('   ❌ Database error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Event Snapshot Creator');
  console.log('=' .repeat(50));
  console.log(`📅 Today: ${new Date().toISOString().split('T')[0]}\n`);

  // Trova eventi da archiviare:
  // - data passata
  // - is_future ancora = 1 (non ancora archiviati)
  // - hanno slug (quindi hanno LP)
  // - non hanno già uno snapshot
  const eventsToArchive = db.prepare(`
    SELECT c.*
    FROM concerts c
    LEFT JOIN landing_snapshots ls ON ls.concert_id = c.id
    WHERE date(c.date) < date('now')
      AND c.is_future = 1
      AND c.slug IS NOT NULL
      AND c.slug != ''
      AND ls.id IS NULL
    ORDER BY c.date DESC
  `).all();

  if (eventsToArchive.length === 0) {
    console.log('✨ No events to archive. All up to date!');
    process.exit(0);
  }

  console.log(`📋 Found ${eventsToArchive.length} event(s) to archive:\n`);

  let successCount = 0;
  let failCount = 0;

  for (const concert of eventsToArchive) {
    const success = await createSnapshot(concert);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('='.repeat(50));

  db.close();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
