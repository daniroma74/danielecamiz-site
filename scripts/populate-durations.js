#!/usr/bin/env node

/**
 * Script per popolare automaticamente le durate dei brani nel repertorio
 * Usa database di durate medie per opere classiche standard
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../cms/db/main.sqlite');

// Database durate medie (minuti) per opere standard
const DURATION_DATABASE = {
  // Mozart - Sinfonie
  'k551': 33, // Jupiter
  'k550': 40, // n.40
  'k543': 32, // n.39
  'k504': 28, // Praga
  'k385': 25, // Haffner
  'k425': 30, // Linz
  'k338': 24, // n.34
  'k319': 22, // n.33
  'k297': 18, // Paris

  // Mozart - Concerti pianoforte
  'k595': 30, // n.27
  'k537': 32, // Coronation
  'k503': 33, // n.25
  'k491': 30, // n.24
  'k488': 27, // n.23
  'k482': 33, // n.22
  'k467': 28, // n.21
  'k466': 31, // n.20
  'k453': 29, // n.17
  'k450': 25, // n.15
  'k449': 23, // n.14
  'k415': 25, // n.13
  'k414': 25, // n.12
  'k413': 24, // n.11
  'k271': 31, // n.9

  // Mozart - Altri concerti
  'k299': 28, // Flauto e arpa
  'k313': 24, // Flauto n.1
  'k314': 21, // Flauto n.2
  'k191': 18, // Fagotto
  'k622': 29, // Clarinetto
  'k412': 15, // Corno n.1
  'k417': 16, // Corno n.2
  'k447': 17, // Corno n.3
  'k495': 17, // Corno n.4
  'k216': 28, // Violino n.3
  'k218': 26, // Violino n.4
  'k219': 30, // Violino n.5

  // Mozart - Ouverture
  'nozze di figaro': 4,
  'flauto magico': 7,
  'don giovanni': 6,
  'così fan tutte': 5,
  'clemenza di tito': 5,

  // Beethoven - Sinfonie
  'op.125': 70, // n.9
  'op.92': 38, // n.7
  'op.93': 26, // n.8
  'op.68': 42, // n.6 Pastorale
  'op.67': 33, // n.5
  'op.60': 36, // n.4
  'op.55': 50, // n.3 Eroica
  'op.36': 33, // n.2
  'op.21': 28, // n.1

  // Beethoven - Concerti
  'op.61': 42, // Violino
  'op.73': 40, // Piano n.5 Emperor
  'op.58': 38, // Piano n.4
  'op.56': 36, // Triplo
  'op.37': 34, // Piano n.3
  'op.19': 30, // Piano n.2
  'op.15': 37, // Piano n.1

  // Beethoven - Ouverture
  'egmont': 8,
  'leonore': 14,
  'coriolan': 8,
  'prometeo': 5,

  // Mendelssohn
  'op.90': 32, // Sinfonia n.3 Scozzese
  'op.52': 30, // Sinfonia n.4 Italiana
  'op.56': 42, // Sinfonia n.5 Riforma
  'op.21': 11, // Sogno di una notte di mezza estate - Ouverture
  'op.26': 8, // Ebridi
  'op.27': 13, // Melusina
  'op.64': 26, // Concerto violino
  'op.25': 29, // Concerto piano n.1
  'op.40': 23, // Concerto piano n.2

  // Brahms
  'op.68': 45, // Sinfonia n.1
  'op.73': 43, // Sinfonia n.2
  'op.90': 37, // Sinfonia n.3
  'op.98': 41, // Sinfonia n.4
  'op.77': 40, // Concerto violino
  'op.83': 50, // Concerto piano n.2
  'op.15': 48, // Concerto piano n.1
  'op.102': 28, // Concerto doppio
  'op.80': 10, // Ouverture accademica
  'op.81': 13, // Ouverture tragica

  // Tchaikovsky
  'op.64': 48, // Sinfonia n.5
  'op.74': 50, // Sinfonia n.6 Patetica
  'op.36': 46, // Sinfonia n.4
  'op.49': 17, // Ouverture 1812
  'op.32': 20, // Romeo e Giulietta
  'op.35': 35, // Concerto violino
  'op.23': 35, // Concerto piano n.1

  // Dvořák
  'op.95': 40, // Sinfonia n.9 Nuovo Mondo
  'op.88': 38, // Sinfonia n.8
  'op.70': 37, // Sinfonia n.7
  'op.53': 30, // Concerto violoncello
  'op.66': 16, // Scherzo capriccioso

  // Schubert
  'd.759': 23, // Sinfonia incompiuta
  'd.944': 55, // Grande Sinfonia in do
  'd.787': 9, // Rosamunde ouverture

  // Schumann
  'op.38': 32, // Sinfonia n.1 Primavera
  'op.61': 30, // Sinfonia n.2
  'op.97': 33, // Sinfonia n.3 Renana
  'op.120': 28, // Sinfonia n.4
  'op.129': 25, // Concerto violoncello
  'op.54': 31, // Concerto piano

  // Grieg
  'op.16': 30, // Concerto piano
  'op.46': 26, // Peer Gynt suite n.1
  'op.55': 22, // Peer Gynt suite n.2
  'op.40': 18, // Holberg suite

  // Rossini - Ouverture (tutte ~7-9 min)
  'barbiere di siviglia': 7,
  'gazza ladra': 10,
  'italiana in algeri': 8,
  'semiramide': 12,
  'guglielmo tell': 12,
  'cenerentola': 8,

  // Verdi - Ouverture
  'forza del destino': 8,
  'vespri siciliani': 10,
  'nabucco': 8,
  'traviata': 4,

  // Chopin
  'op.11': 40, // Concerto n.1
  'op.21': 33, // Concerto n.2

  // Haydn
  'hob.i:94': 24, // Sinfonia Sorpresa
  'hob.i:101': 28, // Sinfonia Orologio
  'hob.i:104': 30, // Sinfonia Londra
  'hob.viib:1': 28, // Concerto violoncello n.1
  'hob.viib:2': 25, // Concerto violoncello n.2

  // Puccini - Arie e ouverture (stimate)
  'manon lescaut': 5,
  'bohème': 5,
  'tosca': 5,
};

// Durate medie per categoria (fallback)
const CATEGORY_DEFAULTS = {
  1: 35, // Sinfonie
  2: 8,  // Ouverture
  3: 32, // Concerti
  4: 20, // Suite
  5: 4,  // Vocale (aria singola)
  6: 15, // Altri generi
};

/**
 * Cerca durata nel database usando matching intelligente
 */
function findDuration(composer, title, subtitle, catalogue, category_id) {
  const searchText = `${title} ${subtitle || ''} ${catalogue || ''}`.toLowerCase();

  // Cerca per numero di catalogo (es. K551, op.68, D.759)
  if (catalogue) {
    const catLower = catalogue.toLowerCase();
    if (DURATION_DATABASE[catLower]) {
      return DURATION_DATABASE[catLower];
    }
  }

  // Cerca per titolo dell'opera
  for (const [key, duration] of Object.entries(DURATION_DATABASE)) {
    if (searchText.includes(key.toLowerCase())) {
      return duration;
    }
  }

  // Ricerca per pattern specifici

  // Mozart sinfonie per numero
  if (composer.includes('Mozart') && title.toLowerCase().includes('sinfonia')) {
    const numMatch = title.match(/n\.?\s*(\d+)/i);
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      // Sinfonie tarde (38-41) più lunghe
      if (num >= 38) return 32;
      if (num >= 30) return 24;
      return 20;
    }
  }

  // Mozart concerti per pianoforte
  if (composer.includes('Mozart') && searchText.includes('concerto') && searchText.includes('piano')) {
    return 28;
  }

  // Beethoven sinfonie
  if (composer.includes('Beethoven') && title.toLowerCase().includes('sinfonia')) {
    const numMatch = title.match(/n\.?\s*(\d+)/i);
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      if (num === 9) return 70;
      if (num === 3) return 50;
      if (num === 6) return 42;
      return 35;
    }
  }

  // Verdi/Puccini: arie ~4-5 min
  if ((composer.includes('Verdi') || composer.includes('Puccini')) && category_id === 5) {
    return 4;
  }

  // Fallback: usa media per categoria
  return CATEGORY_DEFAULTS[category_id] || 15;
}

function main() {
  const db = new Database(DB_PATH);

  console.log('📊 Popolamento durate brani in corso...\n');

  // Leggi tutti i brani con compositore e categoria
  const works = db.prepare(`
    SELECT w.*, c.full_name as composer_name
    FROM works w
    JOIN composers c ON w.composer_id = c.id
    WHERE w.duration_minutes IS NULL
    ORDER BY c.full_name, w.title
  `).all();

  console.log(`Trovati ${works.length} brani senza durata\n`);

  const updateStmt = db.prepare('UPDATE works SET duration_minutes = ? WHERE id = ?');

  let updated = 0;
  const byCategory = {};

  for (const work of works) {
    const duration = findDuration(
      work.composer_name,
      work.title,
      work.subtitle,
      work.catalogue,
      work.category_id
    );

    // Aggiorna il database
    updateStmt.run(duration, work.id);

    updated++;
    byCategory[work.category_id] = (byCategory[work.category_id] || 0) + 1;

    console.log(`✓ [${updated}/${works.length}] ${work.composer_name} - ${work.title} → ${duration} min`);
  }

  console.log(`\n✅ Aggiornati ${updated} brani`);
  console.log('\nDistribuzione per categoria:');
  for (const [cat_id, count] of Object.entries(byCategory)) {
    console.log(`  Categoria ${cat_id}: ${count} brani`);
  }

  // Verifica risultato
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(duration_minutes) as with_duration,
      AVG(duration_minutes) as avg_duration,
      MIN(duration_minutes) as min_duration,
      MAX(duration_minutes) as max_duration
    FROM works
  `).get();

  console.log('\n📈 Statistiche finali:');
  console.log(`  Totale brani: ${stats.total}`);
  console.log(`  Con durata: ${stats.with_duration} (${Math.round(stats.with_duration/stats.total*100)}%)`);
  console.log(`  Durata media: ${Math.round(stats.avg_duration)} minuti`);
  console.log(`  Range: ${stats.min_duration}-${stats.max_duration} minuti`);

  db.close();
  console.log('\n✨ Completato!');
}

main();
