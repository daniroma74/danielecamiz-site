// cms/controllers/repertoireController.js
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { initDatabase } from '../utils/utils.js';
import { groupSoloistsByInstrument } from '../../shared/utils/performersGrouping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Promisify helpers */
const qAll = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));
const qGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null))));

async function columnExists(db, table, col) {
  try {
    const info = await qAll(db, `PRAGMA table_info(${table})`);
    return info.some((c) => (c?.name || '').toLowerCase() === String(col).toLowerCase());
  } catch { return false; }
}
async function pickFirstExistingColumn(db, table, candidates) {
  for (const c of candidates) if (await columnExists(db, table, c)) return c;
  return 'id';
}

/* ========== DEBUG: JSON senza EJS ========== */
export async function debugRepertoire(req, res) {
  try {
    const db = req.app?.locals?.db || (await initDatabase());
    const viewPath = path.resolve(__dirname, '../views/pages/frontend/repertoire.ejs');

    const tables = {
      composers: ['id','full_name','sort_key'],
      categories: ['id','label_it','label_en','label'],
      works: ['id','composer_id','category_id','created_at'],
      concert_program: ['id','work_id','concert_id'],
    };

    const checks = {
      ok: true,
      dbFile: db?.filename || null,
      viewExists: false,
      columns: {},
      now: new Date().toISOString(),
    };

    try { await fs.access(viewPath); checks.viewExists = true; } catch { checks.viewExists = false; }

    for (const [t, cols] of Object.entries(tables)) {
      checks.columns[t] = {};
      for (const c of cols) checks.columns[t][c] = await columnExists(db, t, c);
    }

    res.type('application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(checks, null, 2));
  } catch (e) {
    res.type('application/json; charset=utf-8');
    return res.status(500).send(JSON.stringify({ ok:false, error: String(e?.message || e) }, null, 2));
  }
}

/* ========== PAGE CONTROLLER ========== */
export async function getRepertoirePage(req, res) {
  const lang = res.locals.lang === 'en' ? 'en' : 'it';
  const esc = (s='') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  try {
    const db = req.app?.locals?.db || (await initDatabase());

    const composersOrder = (await columnExists(db, 'composers', 'sort_key')) ? 'c.sort_key' : 'c.full_name';
    const catLabelCol = await pickFirstExistingColumn(db, 'categories', [
      `label_${lang}`, 'label_it', 'label_en', 'label', 'id'
    ]);

    const composers = await qAll(db, `
      SELECT c.*,
             COUNT(DISTINCT w.id)          AS works_count,
             COUNT(DISTINCT cp.concert_id) AS concerts_count
      FROM composers c
      LEFT JOIN works w            ON w.composer_id = c.id
      LEFT JOIN concert_program cp ON cp.work_id = w.id
      GROUP BY c.id
      ORDER BY ${composersOrder}
    `).catch(e => { console.error('[Repertoire] composers:', e); return []; });

    const categories = await qAll(db, `
      SELECT cat.*,
             COUNT(w.id) AS works_count
      FROM categories cat
      LEFT JOIN works w ON w.category_id = cat.id
      GROUP BY cat.id
      ORDER BY ${catLabelCol}
    `).catch(e => { console.error('[Repertoire] categories:', e); return []; });

    const stats = await qGet(db, `
      SELECT 
        (SELECT COUNT(*) FROM composers)                         AS total_composers,
        (SELECT COUNT(*) FROM works)                             AS total_works,
        (SELECT COUNT(DISTINCT concert_id) FROM concert_program) AS total_concerts,
        (SELECT COUNT(*) FROM concert_program)                   AS total_performances
    `).catch(e => {
      console.error('[Repertoire] stats:', e);
      return { total_composers:0, total_works:0, total_concerts:0, total_performances:0 };
    });

    const topWorks = await qAll(db, `
      SELECT w.*,
             c.full_name AS composer_name,
             COUNT(cp.id) AS performance_count
      FROM works w
      JOIN composers c        ON w.composer_id = c.id
      JOIN concert_program cp ON cp.work_id = w.id
      GROUP BY w.id
      ORDER BY performance_count DESC
      LIMIT 10
    `).catch(e => { console.error('[Repertoire] topWorks:', e); return []; });

    const hasCreatedAt = await columnExists(db, 'works', 'created_at');
    const orderCol = hasCreatedAt ? 'w.created_at' : 'w.id';
    const catLangLabel = await pickFirstExistingColumn(db, 'categories', [
      `label_${lang}`, 'label_it', 'label_en', 'label'
    ]);

    // Get works from upcoming concerts (future dates)
    const upcomingWorks = await qAll(db, `
      SELECT DISTINCT w.*,
             c.full_name AS composer_name,
             ${catLangLabel === 'id' ? 'cat.id' : `cat.${catLangLabel}`} AS category_name,
             co.date AS concert_date
      FROM works w
      JOIN composers c         ON w.composer_id = c.id
      LEFT JOIN categories cat ON w.category_id = cat.id
      JOIN concert_program cp  ON cp.work_id = w.id
      JOIN concerts co         ON cp.concert_id = co.id
      WHERE co.date >= date('now')
      ORDER BY co.date ASC, w.title
      LIMIT 20
    `).catch(e => { console.error('[Repertoire] upcomingWorks:', e); return []; });

    // Get collaborators (soloists, choruses, orchestras) - separate queries for each
    let collaborators = { soloists: [], choruses: [], orchestras: [] };
    try {
      // Soloists - exclude choruses (instrument = 'Coro' or 'coro')
      const soloists = await qAll(db, `
        SELECT cp.name, cp.role, cp.instrument, COUNT(*) as concert_count
        FROM concert_performers cp
        WHERE cp.role = 'soloist'
          AND (cp.instrument IS NULL OR LOWER(cp.instrument) NOT LIKE '%coro%')
        GROUP BY cp.name, cp.role, cp.instrument
        ORDER BY concert_count DESC, cp.name
      `);

      // Raggruppa i solisti per strumento usando la funzione condivisa
      const soloistGroups = groupSoloistsByInstrument(soloists);

      // Orchestras
      const orchestras = await qAll(db, `
        SELECT cp.name, cp.role, COUNT(*) as concert_count
        FROM concert_performers cp
        WHERE cp.role = 'orchestra'
        GROUP BY cp.name, cp.role
        ORDER BY concert_count DESC, cp.name
      `);

      // Choruses
      const choruses = await qAll(db, `
        SELECT cp.name, cp.role, COUNT(*) as concert_count
        FROM concert_performers cp
        WHERE cp.role = 'chorus'
        GROUP BY cp.name, cp.role
        ORDER BY concert_count DESC, cp.name
      `);

      collaborators = { soloists, soloistGroups, choruses, orchestras };
    } catch (collabErr) {
      console.error('[Repertoire] collaborators query failed:', collabErr);
    }

    // Get all works for the main listing
    const works = await qAll(db, `
      SELECT w.*,
             c.full_name AS composer_name,
             ${catLangLabel === 'id' ? 'cat.id' : `cat.${catLangLabel}`} AS category_name,
             (SELECT MIN(co.date)
              FROM concert_program cp
              JOIN concerts co ON cp.concert_id = co.id
              WHERE cp.work_id = w.id) AS first_performance_date,
             (SELECT MAX(co.date)
              FROM concert_program cp
              JOIN concerts co ON cp.concert_id = co.id
              WHERE cp.work_id = w.id) AS last_performance_date
      FROM works w
      JOIN composers c         ON w.composer_id = c.id
      LEFT JOIN categories cat ON w.category_id = cat.id
      ORDER BY c.full_name, w.title
    `).catch(e => { console.error('[Repertoire] works:', e); return []; });

    // Top composers by works count (for featured section)
    const topComposers = composers
      .filter(c => c.works_count > 0)
      .sort((a, b) => {
        if (b.works_count !== a.works_count) return b.works_count - a.works_count;
        return b.concerts_count - a.concerts_count;
      })
      .slice(0, 6)
      .map(c => ({
        ...c,
        name: c.full_name,
        portrait_url: c.portrait_url || null
      }));

    // Build composers with their works
    const composersWithWorks = composers.map(composer => {
      const composerWorks = works.filter(w => w.composer_id === composer.id);
      const frequentCount = composerWorks.filter(w =>
        topWorks.some(top => top.id === w.id)
      ).length;
      return {
        ...composer,
        name: composer.full_name,
        birth_year: composer.birth_year || null,
        death_year: composer.death_year || null,
        portrait_url: composer.portrait_url || null,
        works: composerWorks,
        frequently_performed_count: frequentCount
      };
    });

    // Build genres (categories) with their works
    const genres = categories.map(cat => {
      const genreWorks = works.filter(w => w.category_id === cat.id);
      return {
        name: cat[catLabelCol] || cat.label || cat.label_it || 'Unknown',
        count: genreWorks.length,
        works: genreWorks
      };
    }).filter(g => g.count > 0);

    // Timeline data: works grouped by composition period
    const timeline = await qAll(db, `
      SELECT
        CASE
          WHEN year < 1750 THEN 'Barocco'
          WHEN year >= 1750 AND year < 1820 THEN 'Classicismo'
          WHEN year >= 1820 AND year < 1910 THEN 'Romanticismo'
          WHEN year >= 1910 THEN 'Novecento'
        END as period,
        CASE
          WHEN year < 1750 THEN 1
          WHEN year >= 1750 AND year < 1820 THEN 2
          WHEN year >= 1820 AND year < 1910 THEN 3
          WHEN year >= 1910 THEN 4
        END as period_order,
        COUNT(*) as works_count,
        MIN(year) as first_year,
        MAX(year) as last_year,
        COUNT(DISTINCT composer_id) as composers_count
      FROM works
      WHERE year IS NOT NULL AND year > 0
      GROUP BY period
      ORDER BY period_order
    `).catch(e => { console.error('[Repertoire] timeline:', e); return []; });

    // Get detailed works for timeline with decade grouping
    const timelineWorks = await qAll(db, `
      SELECT
        w.*,
        c.full_name as composer_name,
        CASE
          WHEN w.year < 1750 THEN 'Barocco'
          WHEN w.year >= 1750 AND w.year < 1820 THEN 'Classicismo'
          WHEN w.year >= 1820 AND w.year < 1910 THEN 'Romanticismo'
          WHEN w.year >= 1910 THEN 'Novecento'
        END as period,
        (w.year / 10) * 10 as decade
      FROM works w
      JOIN composers c ON w.composer_id = c.id
      WHERE w.year IS NOT NULL AND w.year > 0
      ORDER BY w.year, c.full_name, w.title
    `).catch(e => { console.error('[Repertoire] timelineWorks:', e); return []; });

    // Group works by period and decade
    const timelineByPeriod = {};
    timelineWorks.forEach(work => {
      if (!timelineByPeriod[work.period]) {
        timelineByPeriod[work.period] = {};
      }
      if (!timelineByPeriod[work.period][work.decade]) {
        timelineByPeriod[work.period][work.decade] = [];
      }
      timelineByPeriod[work.period][work.decade].push(work);
    });

    return res.renderPage('pages/frontend/repertoire', {
      title: lang === 'it' ? 'Repertorio' : 'Repertoire',
      description: lang === 'it'
        ? 'Esplora il repertorio completo di Daniele Camiz'
        : 'Explore Daniele Camiz complete repertoire',
      pageKey: 'repertoire',
      composers: composersWithWorks,
      categories,
      genres,
      stats: {
        ...stats,
        total_genres: genres.length
      },
      works,
      topWorks,
      upcomingWorks,
      frequentlyPerformed: topWorks,
      comingSoon: upcomingWorks,
      collaborators,
      topComposers,
      timeline,
      timelineByPeriod,
      pageStyles: [
        '/css/pages/repertoire/repertoire-new.css',
      ],
      pageScripts: ['/js/modules/repertoire/repertoire.js'],
    });

  } catch (error) {
    console.error('[RepertoireController] Fatal:', error);
    try {
      return res.status(500).render('pages/frontend/maintenance', {
        layout: 'layouts/base-frontend',
        lang,
        title: 'Error',
        description: 'Errore caricamento repertorio',
      });
    } catch {
      return res.status(500).send('Errore caricamento repertorio');
    }
  }
}
