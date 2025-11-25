#!/usr/bin/env node

/**
 * Find correct Wikimedia URLs for failed composers and upload to Cloudinary
 * Uses Wikimedia Commons API properly
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

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnwhnz2xy',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Compositori falliti dalla migrazione precedente
const failedComposers = [
  { name: 'Alexandr Kostantinovič Glazunov', slug: 'alexandr-kostantinovi-glazunov', searchName: 'Alexander Glazunov' },
  { name: 'Antonin Dvořak', slug: 'antonin-dvorak', searchName: 'Antonín Dvořák' },
  { name: 'Bedřich Smetana', slug: 'bedrich-smetana', searchName: 'Bedřich Smetana' },
  { name: 'Benjamin Britten', slug: 'benjamin-britten', searchName: 'Benjamin Britten' },
  { name: 'Camille Saint-Saëns', slug: 'camille-saint-saens', searchName: 'Camille Saint-Saëns' },
  { name: 'Carl Maria von Weber', slug: 'carl-maria-von-weber', searchName: 'Carl Maria von Weber' },
  { name: 'Carl Nielsen', slug: 'carl-nielsen', searchName: 'Carl Nielsen' },
  { name: 'Carlos Gardel', slug: 'carlos-gardel', searchName: 'Carlos Gardel' },
  { name: 'Eduardo Di Capua', slug: 'eduardo-di-capua', searchName: 'Eduardo di Capua' },
  { name: 'Edvard Grieg', slug: 'edvard-grieg', searchName: 'Edvard Grieg' },
  { name: 'Edward Elgar', slug: 'edward-elgar', searchName: 'Edward Elgar' },
  { name: 'Ennio Morricone', slug: 'ennio-morricone', searchName: 'Ennio Morricone' },
  { name: 'Fanny Mendelssohn', slug: 'fanny-mendelssohn', searchName: 'Fanny Mendelssohn' },
  { name: 'Franz Schubert', slug: 'franz-schubert', searchName: 'Franz Schubert' },
  { name: 'Gaetano Donizetti', slug: 'gaetano-donizetti', searchName: 'Gaetano Donizetti' },
  { name: 'George Gershwin', slug: 'george-gershwin', searchName: 'George Gershwin' },
  { name: 'Giacomo Puccini', slug: 'giacomo-puccini', searchName: 'Giacomo Puccini' },
  { name: 'Gioachino Rossini', slug: 'gioachino-rossini', searchName: 'Gioachino Rossini' },
  { name: 'Giovanni Paisiello', slug: 'giovanni-paisiello', searchName: 'Giovanni Paisiello' },
  { name: 'Giuseppe Verdi', slug: 'giuseppe-verdi', searchName: 'Giuseppe Verdi' },
  { name: 'Jean Sibelius', slug: 'jean-sibelius', searchName: 'Jean Sibelius' },
  { name: 'Johann Strauss Jr.', slug: 'johann-strauss-jr', searchName: 'Johann Strauss II' },
  { name: 'Luigi Cherubini', slug: 'luigi-cherubini', searchName: 'Luigi Cherubini' },
  { name: 'Léo Delibes', slug: 'leo-delibes', searchName: 'Léo Delibes' },
  { name: 'Nicolaj Rimskij-Korsakov', slug: 'nicolaj-rimskij-korsakov', searchName: 'Nikolai Rimsky-Korsakov' },
  { name: 'Ottorino Respighi', slug: 'ottorino-respighi', searchName: 'Ottorino Respighi' },
  { name: 'Pietro Mascagni', slug: 'pietro-mascagni', searchName: 'Pietro Mascagni' },
  { name: 'Pëtr Il\'ič Tchaikovskij', slug: 'petr-ilic-tchaikovskij', searchName: 'Pyotr Ilyich Tchaikovsky' },
  { name: 'Robert Schumann', slug: 'robert-schumann', searchName: 'Robert Schumann' },
  { name: 'Ruggero Leoncavallo', slug: 'ruggero-leoncavallo', searchName: 'Ruggero Leoncavallo' },
  { name: 'Samuel Barber', slug: 'samuel-barber', searchName: 'Samuel Barber' },
  { name: 'Sergej Prokofiev', slug: 'sergej-prokofiev', searchName: 'Sergei Prokofiev' },
  { name: 'Vincenzo Bellini', slug: 'vincenzo-bellini', searchName: 'Vincenzo Bellini' }
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'DanieleCamizBot/1.0 (https://danielecamiz.com; noreply@danielecamiz.com)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, {
      headers: {
        'User-Agent': 'DanieleCamizBot/1.0'
      }
    }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}`));
      }

      const file = fs.createWriteStream(filepath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });

      file.on('error', (err) => {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        reject(err);
      });
    }).on('error', reject);
  });
}

async function findWikimediaImage(composerName) {
  try {
    // Step 1: Search for Wikipedia page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(composerName)}&prop=pageimages|pageterms&pithumbsize=800`;

    const data = await fetchJSON(searchUrl);
    const pages = data.query?.pages;

    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null;

    const page = pages[pageId];
    const imageUrl = page.thumbnail?.source;

    if (!imageUrl) return null;

    // Convert thumbnail URL to full image URL
    const fullImageUrl = imageUrl.replace(/\/\d+px-/, '/800px-');

    return fullImageUrl;

  } catch (error) {
    console.error(`   ⚠️  API error: ${error.message}`);
    return null;
  }
}

async function uploadToCloudinary(filepath, publicId) {
  const result = await cloudinary.uploader.upload(filepath, {
    folder: 'danielecamiz/composers',
    public_id: publicId,
    resource_type: 'image',
    overwrite: true,
    invalidate: true
  });
  return result.secure_url;
}

async function updateComposerInDB(name, url) {
  const db = new sqlite3.Database(DB_PATH);

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE composers SET portrait_url = ? WHERE full_name = ?`,
      [url, name],
      (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function main() {
  console.log(`\n🔍 Cercando immagini per ${failedComposers.length} compositori...\n`);

  let uploaded = 0;
  let failed = [];

  for (const composer of failedComposers) {
    const idx = failedComposers.indexOf(composer) + 1;

    console.log(`[${idx}/${failedComposers.length}] ${composer.name}`);

    try {
      console.log(`   🔍 Cerca "${composer.searchName}" su Wikipedia...`);
      const imageUrl = await findWikimediaImage(composer.searchName);

      if (!imageUrl) {
        failed.push({ ...composer, reason: 'Immagine non trovata su Wikipedia' });
        console.log(`   ❌ Non trovata\n`);
        continue;
      }

      console.log(`   📥 Download: ${imageUrl}`);
      const tempFile = path.join(DOWNLOAD_DIR, `${composer.slug}.jpg`);

      await downloadFile(imageUrl, tempFile);

      const stats = fs.statSync(tempFile);
      console.log(`   ✅ Downloaded (${Math.round(stats.size / 1024)} KB)`);

      console.log(`   ☁️  Upload Cloudinary...`);
      const cloudinaryUrl = await uploadToCloudinary(tempFile, composer.slug);
      console.log(`   ✅ Uploaded`);

      await updateComposerInDB(composer.name, cloudinaryUrl);
      uploaded++;
      console.log(`   💾 Database updated\n`);

      fs.unlinkSync(tempFile);

      // Rate limit - Wikipedia asks for max 200 req/sec
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      failed.push({ ...composer, reason: error.message });
      console.log(`   ❌ ERRORE: ${error.message}\n`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 RIEPILOGO\n`);
  console.log(`Totale compositori: ${failedComposers.length}`);
  console.log(`✅ Migrati a Cloudinary: ${uploaded}`);
  console.log(`❌ Falliti: ${failed.length}`);

  if (failed.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`❌ FALLITI (${failed.length}):\n`);
    failed.forEach(item => {
      console.log(`   ${item.name}`);
      console.log(`   Errore: ${item.reason}\n`);
    });
  }

  console.log(`\n✅ FATTO!\n`);

  // Cleanup
  if (fs.existsSync(DOWNLOAD_DIR)) {
    const files = fs.readdirSync(DOWNLOAD_DIR);
    files.forEach(file => fs.unlinkSync(path.join(DOWNLOAD_DIR, file)));
    fs.rmdirSync(DOWNLOAD_DIR);
  }
}

if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Credenziali Cloudinary mancanti!');
  process.exit(1);
}

main();
