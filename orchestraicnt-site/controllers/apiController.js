// orchestraicnt-site/controllers/apiController.js
const { localDB, sharedDB } = require('../config/database');

/**
 * GET /api/settings
 * Restituisce tutte le impostazioni del sito
 */
async function getSettings(req, res) {
  try {
    const settings = await localDB.all(
      'SELECT setting_key, setting_value FROM site_settings'
    );

    // Converte array in oggetto per facilità d'uso nel frontend
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('[API] Error loading settings:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento delle impostazioni'
    });
  }
}

/**
 * GET /api/concerts/upcoming
 * Restituisce i prossimi concerti dell'Orchestra ICNT dal database condiviso
 * Filtra solo i concerti con orchestra = "Orchestra ICNT"
 */
async function getUpcomingConcerts(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 3;

    // Query per ottenere i concerti futuri dell'Orchestra ICNT
    const concerts = await sharedDB.all(`
      SELECT
        c.id,
        c.title,
        c.date,
        c.location,
        c.poster_cloudinary_id,
        c.program_notes,
        cp.orchestra,
        cp.conductor,
        cp.soloists
      FROM concerts c
      LEFT JOIN view_concert_personnel_agg cp ON cp.concert_id = c.id
      WHERE (c.is_future = 1 OR date(c.date) >= date('now'))
        AND LOWER(cp.orchestra) LIKE '%icnt%'
      ORDER BY c.date ASC
      LIMIT ?
    `, [limit]);

    // Per ogni concerto, carica il programma
    for (let concert of concerts) {
      const program = await sharedDB.all(`
        SELECT
          w.title as work_title,
          w.catalogue as work_catalogue,
          w.work_key,
          comp.full_name as composer_name,
          comp.short_name as composer_short,
          cat.label_it as category
        FROM concert_program cp
        JOIN works w ON w.id = cp.work_id
        JOIN composers comp ON comp.id = w.composer_id
        JOIN categories cat ON cat.id = w.category_id
        WHERE cp.concert_id = ?
        ORDER BY cp.position ASC
      `, [concert.id]);

      concert.program = program;

      // Formatta il programma come stringa user-friendly
      concert.programText = program.map(p => {
        const composer = p.composer_short || p.composer_name;
        const work = p.work_title;
        const key = p.work_key ? ` in ${p.work_key}` : '';
        const catalogue = p.work_catalogue ? `, ${p.work_catalogue}` : '';
        return `${composer} - ${work}${key}${catalogue}`;
      }).join(', ');
    }

    res.json({
      success: true,
      data: concerts
    });
  } catch (error) {
    console.error('[API] Error loading concerts:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento dei concerti'
    });
  }
}

module.exports = {
  getSettings,
  getUpcomingConcerts
};
