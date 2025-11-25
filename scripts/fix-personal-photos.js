#!/usr/bin/env node

/**
 * Sposta le foto personali nella cartella corretta e aggiorna il database
 */

import { v2 as cloudinary } from 'cloudinary';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnwhnz2xy',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Mapping: nome compositore → (slug, public_id attuale su Cloudinary)
const photos = [
  { name: 'Vasily Kalinnikov', slug: 'vasily-kalinnikov', cloudinaryId: 'vasily-kalinnikov' },
  { name: 'Francesco Sartori', slug: 'francesco-sartori', cloudinaryId: 'francesco-sartori_mfs4hk' },
  { name: 'Stanislao Gastaldon', slug: 'stanislao-gastaldon', cloudinaryId: 'stanislao-gastaldon_zeaqqo' },
  { name: 'Ernesto De Curtis', slug: 'ernesto-de-curtis', cloudinaryId: 'ernesto-de-curtis_mhes7l' },
  { name: 'Marco Enrico Bossi', slug: 'marco-enrico-bossi', cloudinaryId: 'marco-enrico-bossi_ftu6dq' },
  { name: 'Peter Warlock', slug: 'peter-warlock', cloudinaryId: 'peter-warlock_f4h2qh' },
  { name: 'Salvatore Cardillo', slug: 'salvatore-cardillo', cloudinaryId: 'salvatore-cardillo_uc74gb' },
  { name: 'Yeon-jun Kim', slug: 'yeon-jun-kim', cloudinaryId: 'yeon-jun-kim_rd5bu0' }
];

async function main() {
  console.log('\n🔧 Spostamento foto nella cartella corretta...\n');

  let moved = 0;
  let updated = 0;

  for (const photo of photos) {
    try {
      console.log(`📸 ${photo.name}`);
      console.log(`   Da: ${photo.cloudinaryId}`);
      console.log(`   A: danielecamiz/composers/${photo.slug}`);

      // Rinomina/sposta su Cloudinary
      const result = await cloudinary.uploader.rename(
        photo.cloudinaryId,
        `danielecamiz/composers/${photo.slug}`,
        { overwrite: true, invalidate: true }
      );

      console.log(`   ✅ Spostato`);
      moved++;

      const cloudinaryUrl = result.secure_url;

      // Aggiorna database
      const db = new sqlite3.Database(DB_PATH);
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE composers SET portrait_url = ? WHERE full_name = ?`,
          [cloudinaryUrl, photo.name],
          (err) => {
            db.close();
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log(`   💾 Database aggiornato`);
      console.log(`   ${cloudinaryUrl}\n`);
      updated++;

    } catch (error) {
      console.log(`   ❌ ERRORE: ${error.message}\n`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ FATTO!\n`);
  console.log(`Foto spostate: ${moved}/${photos.length}`);
  console.log(`Database aggiornato: ${updated}/${photos.length}`);
  console.log(`\n⚠️  MANCANO 2 FOTO:`);
  console.log(`   - Dong-jin Kim (dong-jin-kim.jpg)`);
  console.log(`   - Young-seop Choi (young-seop-choi.jpg)`);
  console.log(`\nCaricale su Cloudinary nella cartella danielecamiz/composers/`);
  console.log(`e poi esegui: node scripts/update-personal-composers.js\n`);
}

main();
