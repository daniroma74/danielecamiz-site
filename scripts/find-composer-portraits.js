#!/usr/bin/env node

/**
 * Script per trovare automaticamente i ritratti dei compositori da Wikimedia Commons
 * Usa Wikipedia API per cercare le immagini dei compositori
 */

import https from 'https';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'cms', 'db', 'main.sqlite');

// Mappa nomi italiani → nomi Wikipedia (quando diversi)
const NAME_MAPPINGS = {
  'Alexandr Kostantinovič Glazunov': 'Alexander Glazunov',
  'Bedřich Smetana': 'Bedrich Smetana',
  'Nicolaj Rimskij-Korsakov': 'Nikolai Rimsky-Korsakov',
  'Sergej Prokofiev': 'Sergei Prokofiev',
  'Léo Delibes': 'Léo Delibes'
};

function getWikipediaName(fullName) {
  return NAME_MAPPINGS[fullName] || fullName;
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function findComposerPortrait(fullName) {
  const wikiName = getWikipediaName(fullName);
  const searchName = encodeURIComponent(wikiName);

  try {
    // Step 1: Cerca la pagina Wikipedia
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&titles=${searchName}&prop=pageimages&pithumbsize=500`;
    const searchData = await fetchJSON(searchUrl);

    const pages = searchData.query?.pages;
    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null; // Pagina non trovata

    const thumbnail = pages[pageId]?.thumbnail?.source;
    if (!thumbnail) return null;

    // Usa direttamente il thumbnail (già ottimizzato)
    return thumbnail;

  } catch (error) {
    console.error(`Errore per ${fullName}:`, error.message);
    return null;
  }
}

async function main() {
  const db = new sqlite3.Database(DB_PATH);

  const getComposers = () => new Promise((resolve, reject) => {
    db.all(
      `SELECT id, full_name FROM composers WHERE portrait_url IS NULL OR portrait_url = '' ORDER BY full_name`,
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
    console.log(`\n🎨 Trovati ${composers.length} compositori senza ritratto\n`);

    let found = 0;
    let notFound = 0;

    for (const composer of composers) {
      process.stdout.write(`Cercando ${composer.full_name}... `);

      const portraitUrl = await findComposerPortrait(composer.full_name);

      if (portraitUrl) {
        console.log(`✅ TROVATO!`);
        console.log(`   ${portraitUrl}`);
        await updateComposer(composer.id, portraitUrl);
        found++;
      } else {
        console.log(`❌ Non trovato`);
        notFound++;
      }

      // Pausa per non sovraccaricare l'API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n\n📊 RIEPILOGO:\n`);
    console.log(`Totale compositori: ${composers.length}`);
    console.log(`Ritratti trovati: ${found}`);
    console.log(`Non trovati: ${notFound}`);

    if (found > 0) {
      console.log(`\n✅ RITRATTI AGGIUNTI AL DATABASE!\n`);
    }

  } catch (error) {
    console.error('Errore:', error);
  } finally {
    db.close();
  }
}

main();
