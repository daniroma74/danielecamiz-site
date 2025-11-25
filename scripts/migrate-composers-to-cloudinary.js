#!/usr/bin/env node

/**
 * Script to migrate all composer portraits to Cloudinary
 * 1. Downloads Wikimedia Commons images for famous composers
 * 2. Uploads all images to Cloudinary (danielecamiz/composers/)
 * 3. Updates database with new Cloudinary URLs
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');
const DOWNLOAD_DIR = path.join(__dirname, 'composer-photos-temp');

// Configure Cloudinary (using environment variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnwhnz2xy',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

/**
 * Download file from URL
 */
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        file.close();
        fs.unlinkSync(filepath);
        return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        return reject(new Error(`HTTP ${response.statusCode}`));
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

/**
 * Get actual Wikimedia Commons image URL from page URL
 */
async function getWikimediaImageUrl(composerName) {
  return new Promise((resolve, reject) => {
    const searchName = encodeURIComponent(composerName);
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${searchName}&prop=pageimages&format=json&pithumbsize=800`;

    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query?.pages;
          if (!pages) return resolve(null);

          const pageId = Object.keys(pages)[0];
          if (pageId === '-1') return resolve(null);

          const imageUrl = pages[pageId]?.thumbnail?.source;
          resolve(imageUrl || null);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Upload image to Cloudinary
 */
async function uploadToCloudinary(filepath, publicId) {
  try {
    const result = await cloudinary.uploader.upload(filepath, {
      folder: 'danielecamiz/composers',
      public_id: publicId,
      resource_type: 'image',
      overwrite: true,
      invalidate: true
    });
    return result.secure_url;
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
}

/**
 * Get slug from composer name
 */
function getSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Main migration function
 */
async function main() {
  const db = new sqlite3.Database(DB_PATH);

  const getComposers = () => new Promise((resolve, reject) => {
    db.all(
      `SELECT id, full_name, slug, portrait_url FROM composers ORDER BY full_name`,
      (err, rows) => err ? reject(err) : resolve(rows)
    );
  });

  const updateComposer = (id, url) => new Promise((resolve, reject) => {
    db.run(
      `UPDATE composers SET portrait_url = ? WHERE id = ?`,
      [url, id],
      (err) => err ? reject(err) : resolve()
    );
  });

  try {
    const composers = await getComposers();
    console.log(`\n🎨 Trovati ${composers.length} compositori da migrare\n`);

    let downloaded = 0;
    let uploaded = 0;
    let failed = [];
    let needManual = [];

    // Define composers with personal photos (user has these files)
    const personalPhotos = [
      'Vasily Kalinnikov',
      'Francesco Sartori',
      'Stanislao Gastaldon',
      'Ernesto De Curtis',
      'Dong-jin Kim',
      'Marco Enrico Bossi',
      'Peter Warlock',
      'Salvatore Cardillo',
      'Yeon-jun Kim',
      'Young-seop Choi'
    ];

    for (const composer of composers) {
      const slug = composer.slug || getSlug(composer.full_name);

      console.log(`\n[${composers.indexOf(composer) + 1}/${composers.length}] ${composer.full_name}`);

      // Skip if user has personal photo
      if (personalPhotos.includes(composer.full_name)) {
        needManual.push({
          name: composer.full_name,
          slug: slug,
          reason: 'Foto personale da caricare manualmente'
        });
        console.log(`   ⏭️  SKIP - Foto personale (carica manualmente come: ${slug}.jpg)`);
        continue;
      }

      // Skip if already placeholder
      if (composer.portrait_url && composer.portrait_url.includes('placeholder')) {
        console.log(`   ⏭️  SKIP - Placeholder (no photo available)`);
        continue;
      }

      try {
        // Try to get image from Wikipedia API
        console.log(`   🔍 Cercando su Wikipedia...`);
        const imageUrl = await getWikimediaImageUrl(composer.full_name);

        if (!imageUrl) {
          failed.push({
            name: composer.full_name,
            slug: slug,
            reason: 'Immagine non trovata su Wikipedia'
          });
          console.log(`   ❌ Non trovata`);
          continue;
        }

        console.log(`   📥 Download da: ${imageUrl}`);
        const tempFile = path.join(DOWNLOAD_DIR, `${slug}.jpg`);

        await downloadFile(imageUrl, tempFile);
        downloaded++;
        console.log(`   ✅ Downloaded`);

        // Upload to Cloudinary
        console.log(`   ☁️  Upload a Cloudinary...`);
        const cloudinaryUrl = await uploadToCloudinary(tempFile, slug);
        console.log(`   ✅ Uploaded: ${cloudinaryUrl}`);

        // Update database
        await updateComposer(composer.id, cloudinaryUrl);
        uploaded++;
        console.log(`   💾 Database aggiornato`);

        // Clean up temp file
        fs.unlinkSync(tempFile);

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        failed.push({
          name: composer.full_name,
          slug: slug,
          reason: error.message
        });
        console.log(`   ❌ ERRORE: ${error.message}`);
      }
    }

    console.log(`\n\n${'='.repeat(80)}`);
    console.log(`📊 RIEPILOGO MIGRAZIONE\n`);
    console.log(`Totale compositori: ${composers.length}`);
    console.log(`✅ Scaricati e caricati: ${uploaded}`);
    console.log(`📋 Da caricare manualmente: ${needManual.length}`);
    console.log(`❌ Falliti: ${failed.length}`);

    if (needManual.length > 0) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 FOTO PERSONALI DA CARICARE MANUALMENTE (${needManual.length}):\n`);
      needManual.forEach(item => {
        console.log(`   - ${item.name}`);
        console.log(`     Rinomina il file come: ${item.slug}.jpg`);
        console.log(`     Carica su Cloudinary in: danielecamiz/composers/`);
        console.log(``);
      });
    }

    if (failed.length > 0) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`❌ COMPOSITORI FALLITI (${failed.length}):\n`);
      failed.forEach(item => {
        console.log(`   - ${item.name}`);
        console.log(`     Motivo: ${item.reason}`);
        console.log(`     Slug per upload: ${item.slug}.jpg`);
        console.log(``);
      });
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n✅ MIGRAZIONE COMPLETATA!\n`);

    if (needManual.length > 0) {
      console.log(`PROSSIMI PASSI:`);
      console.log(`1. Rinomina le tue 10 foto personali con i nomi slug indicati sopra`);
      console.log(`2. Carica le foto su: https://console.cloudinary.com/console/c-bc4e1d37ac81f064ca5ffd2e3ded09/media_library/folders/danielecamiz%2Fcomposers`);
      console.log(`3. Esegui: node scripts/update-personal-composers.js`);
      console.log(``);
    }

  } catch (error) {
    console.error('❌ ERRORE FATALE:', error);
  } finally {
    db.close();

    // Clean up temp directory
    if (fs.existsSync(DOWNLOAD_DIR)) {
      const files = fs.readdirSync(DOWNLOAD_DIR);
      files.forEach(file => fs.unlinkSync(path.join(DOWNLOAD_DIR, file)));
      fs.rmdirSync(DOWNLOAD_DIR);
    }
  }
}

// Check Cloudinary credentials
if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ ERRORE: Credenziali Cloudinary mancanti!');
  console.error('Esegui:');
  console.error('export CLOUDINARY_API_KEY="your_api_key"');
  console.error('export CLOUDINARY_API_SECRET="your_api_secret"');
  process.exit(1);
}

main();
