#!/usr/bin/env node

/**
 * Updates database with Cloudinary URLs for personal composer photos
 * Run this AFTER uploading your 10 personal photos to Cloudinary
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dnwhnz2xy/image/upload';

// Personal photos mapping: composer name -> cloudinary public_id
const personalPhotos = {
  'Vasily Kalinnikov': 'kalinnikov',
  'Francesco Sartori': 'sartori',
  'Stanislao Gastaldon': 'gastaldon',
  'Ernesto De Curtis': 'decurtis',
  'Dong-jin Kim': 'dongjin-kim',
  'Marco Enrico Bossi': 'bossi',
  'Peter Warlock': 'warlock',
  'Salvatore Cardillo': 'cardillo',
  'Yeon-jun Kim': 'yeonjun-kim',
  'Young-seop Choi': 'youngseop-choi'
};

async function main() {
  const db = new sqlite3.Database(DB_PATH);

  const updateComposer = (name, url) => new Promise((resolve, reject) => {
    db.run(
      `UPDATE composers SET portrait_url = ? WHERE full_name = ?`,
      [url, name],
      (err) => err ? reject(err) : resolve()
    );
  });

  try {
    console.log(`\n📸 Aggiornamento foto personali compositori...\n`);

    for (const [name, publicId] of Object.entries(personalPhotos)) {
      const cloudinaryUrl = `${CLOUDINARY_BASE}/danielecamiz/composers/${publicId}.jpg`;

      try {
        await updateComposer(name, cloudinaryUrl);
        console.log(`✅ ${name}`);
        console.log(`   ${cloudinaryUrl}\n`);
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}\n`);
      }
    }

    console.log(`\n✅ FATTO! Ricarica la pagina repertorio per vedere le foto.\n`);

  } catch (error) {
    console.error('❌ ERRORE:', error);
  } finally {
    db.close();
  }
}

main();
