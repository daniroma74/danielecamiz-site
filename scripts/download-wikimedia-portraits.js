#!/usr/bin/env node

/**
 * Download portraits directly from Wikimedia Commons URLs already in database
 * Then upload to Cloudinary
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

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnwhnz2xy',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (response) => {
      // Follow redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith('http')) {
          // Relative redirect
          const urlObj = new URL(url);
          return downloadFile(urlObj.origin + redirectUrl, filepath).then(resolve).catch(reject);
        }
        return downloadFile(redirectUrl, filepath).then(resolve).catch(reject);
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
        fs.unlinkSync(filepath);
        reject(err);
      });
    });

    request.on('error', reject);
  });
}

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
    throw new Error(`Cloudinary: ${error.message}`);
  }
}

function getSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const db = new sqlite3.Database(DB_PATH);

  const getComposers = () => new Promise((resolve, reject) => {
    db.all(
      `SELECT id, full_name, slug, portrait_url FROM composers
       WHERE portrait_url LIKE '%wikimedia%' OR portrait_url LIKE '%wikipedia%'
       ORDER BY full_name`,
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
    console.log(`\n🖼️  Trovati ${composers.length} compositori con URL Wikimedia\n`);

    let uploaded = 0;
    let failed = [];

    for (const composer of composers) {
      const slug = composer.slug || getSlug(composer.full_name);
      const idx = composers.indexOf(composer) + 1;

      console.log(`[${idx}/${composers.length}] ${composer.full_name}`);
      console.log(`   URL: ${composer.portrait_url}`);

      try {
        const tempFile = path.join(DOWNLOAD_DIR, `${slug}.jpg`);

        console.log(`   📥 Download...`);
        await downloadFile(composer.portrait_url, tempFile);

        const stats = fs.statSync(tempFile);
        console.log(`   ✅ Downloaded (${Math.round(stats.size / 1024)} KB)`);

        console.log(`   ☁️  Upload Cloudinary...`);
        const cloudinaryUrl = await uploadToCloudinary(tempFile, slug);
        console.log(`   ✅ Uploaded`);

        await updateComposer(composer.id, cloudinaryUrl);
        uploaded++;
        console.log(`   💾 Database updated\n`);

        fs.unlinkSync(tempFile);

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        failed.push({
          name: composer.full_name,
          slug: slug,
          url: composer.portrait_url,
          reason: error.message
        });
        console.log(`   ❌ ERRORE: ${error.message}\n`);
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 RIEPILOGO\n`);
    console.log(`Totale compositori Wikimedia: ${composers.length}`);
    console.log(`✅ Migrati a Cloudinary: ${uploaded}`);
    console.log(`❌ Falliti: ${failed.length}`);

    if (failed.length > 0) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`❌ FALLITI (${failed.length}):\n`);
      failed.forEach(item => {
        console.log(`   ${item.name}`);
        console.log(`   Slug: ${item.slug}.jpg`);
        console.log(`   Errore: ${item.reason}\n`);
      });
    }

    console.log(`\n✅ MIGRAZIONE COMPLETATA!\n`);

  } catch (error) {
    console.error('❌ ERRORE:', error);
  } finally {
    db.close();

    if (fs.existsSync(DOWNLOAD_DIR)) {
      const files = fs.readdirSync(DOWNLOAD_DIR);
      files.forEach(file => fs.unlinkSync(path.join(DOWNLOAD_DIR, file)));
      fs.rmdirSync(DOWNLOAD_DIR);
    }
  }
}

if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ ERRORE: Credenziali Cloudinary mancanti!');
  process.exit(1);
}

main();
