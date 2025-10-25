// concerts-admin/routes/api.js
import { Router } from 'express';
import { requireAuth } from '../middleware/simpleAuth.js';
import RepertoireController from '../controllers/repertoireController.js';
import { dbPromise } from '../config/database.js';

const router = Router();
const repertoireController = new RepertoireController();

router.use(requireAuth);

// ========== REPERTOIRE ==========

// Works
router.get('/repertoire/search', (req, res, next) => 
  repertoireController.search(req, res, next)
);

router.get('/repertoire/:id', (req, res, next) => 
  repertoireController.getById(req, res, next)
);

router.post('/repertoire/works', (req, res, next) => 
  repertoireController.save(req, res, next)
);

router.put('/repertoire/works/:id', (req, res, next) => 
  repertoireController.save(req, res, next)
);

router.delete('/repertoire/works/:id', (req, res, next) => 
  repertoireController.deleteById(req, res, next)
);

// Movements
router.get('/repertoire/works/:workId/movements', (req, res, next) => 
  repertoireController.getMovementsByWork(req, res, next)
);

router.post('/repertoire/movements', (req, res, next) => 
  repertoireController.createMovement(req, res, next)
);

router.put('/repertoire/movements/:id', (req, res, next) => 
  repertoireController.updateMovement(req, res, next)
);

router.delete('/repertoire/movements/:id', (req, res, next) => 
  repertoireController.deleteMovement(req, res, next)
);

// ========== COMPOSERS ==========

router.get('/composers', async (req, res, next) => {
  try {
    const composers = await dbPromise.all(
      'SELECT * FROM composers ORDER BY sort_key, full_name'
    );
    res.json({ success: true, composers });
  } catch (error) {
    next(error);
  }
});

router.get('/composers/search', async (req, res, next) => {
  try {
    const query = req.query.q || '';
    
    if (query.length < 2) {
      return res.json({ success: true, composers: [] });
    }
    
    const composers = await dbPromise.all(
      `SELECT * FROM composers 
       WHERE full_name LIKE ? OR short_name LIKE ?
       ORDER BY sort_key, full_name
       LIMIT 10`,
      [`%${query}%`, `%${query}%`]
    );
    
    res.json({ success: true, composers });
  } catch (error) {
    next(error);
  }
});

router.post('/composers', async (req, res, next) => {
  try {
    const { full_name, short_name } = req.body;
    
    if (!full_name) {
      return res.status(400).json({
        success: false,
        error: 'full_name obbligatorio'
      });
    }
    
    const parts = full_name.split(' ');
    const lastName = parts[parts.length - 1];
    const sortKey = `${lastName}, ${parts.slice(0, -1).join(' ')}`;
    
    const slug = full_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const result = await dbPromise.run(
      `INSERT INTO composers (full_name, short_name, sort_key, slug)
       VALUES (?, ?, ?, ?)`,
      [full_name, short_name || lastName, sortKey, slug]
    );
    
    res.json({
      success: true,
      message: 'Compositore creato',
      composer_id: result.lastID
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({
        success: false,
        error: 'Compositore già esistente'
      });
    }
    next(error);
  }
});

// ========== CATEGORIES ==========

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await dbPromise.all(
      'SELECT * FROM categories ORDER BY position, label_it'
    );
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
});
// AGGIUNGI in routes/api.js DOPO le route dei movimenti e PRIMA dei concerti

// Advanced repertoire search
router.get('/repertoire/advanced-search', async (req, res, next) => {
  try {
    const { composer, title, category, key } = req.query;
    
    let query = `
      SELECT w.*, 
             c.full_name as composer_name, 
             cat.label_it as category_name
      FROM works w
      LEFT JOIN composers c ON w.composer_id = c.id
      LEFT JOIN categories cat ON w.category_id = cat.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (composer && composer.trim()) {
      query += ` AND c.full_name LIKE ?`;
      params.push(`%${composer.trim()}%`);
    }
    
    if (title && title.trim()) {
      query += ` AND w.title LIKE ?`;
      params.push(`%${title.trim()}%`);
    }
    
    if (category && category !== '') {
      query += ` AND w.category_id = ?`;
      params.push(parseInt(category));
    }
    
    if (key && key.trim()) {
      query += ` AND w.work_key LIKE ?`;
      params.push(`%${key.trim()}%`);
    }
    
    query += ` ORDER BY c.sort_key, w.title LIMIT 100`;
    
   const works = await dbPromise.all(query, params);
    
    res.json({ success: true, works });
  } catch (error) {
    next(error);
  }
});

// ========== CONCERTS ==========

// GET all concerts with performers
router.get('/concerts', async (req, res, next) => {
  try {
    const concerts = await dbPromise.all(
      `SELECT c.*,
              GROUP_CONCAT(CASE WHEN cp.role = 'conductor' THEN cp.name END) as conductor_name,
              GROUP_CONCAT(CASE WHEN cp.role = 'orchestra' THEN cp.name END) as orchestra_name
       FROM concerts c
       LEFT JOIN concert_performers cp ON c.id = cp.concert_id
       GROUP BY c.id
       ORDER BY c.date DESC`
    );
    
    res.json({ success: true, concerts });
  } catch (error) {
    next(error);
  }
});

// GET single concert with all details
router.get('/concerts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get main concert data
    const concert = await dbPromise.get(
      'SELECT * FROM concerts WHERE id = ?',
      [id]
    );
    
    if (!concert) {
      return res.status(404).json({ 
        success: false, 
        error: 'Concerto non trovato' 
      });
    }
    
    // Get performers
    const performers = await dbPromise.all(
      'SELECT role, name, instrument FROM concert_performers WHERE concert_id = ?',
      [id]
    );
    
    // Organize performers by role
    const conductor = performers.find(p => p.role === 'conductor');
    const orchestra = performers.find(p => p.role === 'orchestra');
    const soloists = performers.filter(p => p.role === 'soloist');
    
    // Get program works
    const program = await dbPromise.all(
      `SELECT w.*, cp.position 
       FROM concert_program cp
       JOIN works w ON cp.work_id = w.id
       WHERE cp.concert_id = ?
       ORDER BY cp.position`,
      [id]
    );
    
    // Combine all data
    const response = {
      ...concert,
      conductor_name: conductor ? conductor.name : '',
      orchestra_name: orchestra ? orchestra.name : '',
      soloists: soloists.map(s => ({
        name: s.name,
        instrument: s.instrument || ''
      })),
      program: program
    };
    
    res.json({ success: true, concert: response });
  } catch (error) {
    next(error);
  }
});

// GET performers for a concert
router.get('/concerts/:id/performers', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const performers = await dbPromise.all(
      'SELECT role, name, instrument FROM concert_performers WHERE concert_id = ?',
      [id]
    );
    
    const result = {
      conductor: null,
      orchestra: null,
      soloists: []
    };
    
    performers.forEach(p => {
      if (p.role === 'conductor') {
        result.conductor = p.name;
      } else if (p.role === 'orchestra') {
        result.orchestra = p.name;
      } else if (p.role === 'soloist') {
        result.soloists.push({
          name: p.name,
          instrument: p.instrument || ''
        });
      }
    });
    
    res.json({
      success: true,
      performers: result
    });
  } catch (error) {
    next(error);
  }
});

// POST new concert
router.post('/concerts', async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      date,
      starts_at,
      location,
      slug,
      description_short,
      description_html,
      conductor_name,
      orchestra_name,
      soloists,
      selected_works,
      program_notes,
      program_details,
      poster_cloudinary_id,
      poster_local_filename,
      tags
    } = req.body;
    
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFuture = selectedDate >= today ? 1 : 0;
    
    const result = await dbPromise.run(
      `INSERT INTO concerts 
       (title, subtitle, date, starts_at, location, slug, 
        description_short, description_html,
        is_future, program_notes, program_details,
        poster_cloudinary_id, poster_local_filename, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        subtitle || null,
        date,
        starts_at || '20:00',
        location,
        isFuture ? slug : null,
        description_short || null,
        description_html || null,
        isFuture,
        program_notes || null,
        program_details || null,
        poster_cloudinary_id || null,
        poster_local_filename || null,
        tags || null
      ]
    );
    
    const concertId = result.lastID;
    
    // Save performers
    if (conductor_name) {
      await dbPromise.run(
        `INSERT INTO concert_performers (concert_id, role, name)
         VALUES (?, 'conductor', ?)`,
        [concertId, conductor_name]
      );
    }
    
    if (orchestra_name) {
      await dbPromise.run(
        `INSERT INTO concert_performers (concert_id, role, name)
         VALUES (?, 'orchestra', ?)`,
        [concertId, orchestra_name]
      );
    }
    
    if (soloists) {
      const soloistsList = JSON.parse(soloists);
      for (const soloist of soloistsList) {
        if (soloist.name && soloist.name.trim()) {
          await dbPromise.run(
            `INSERT INTO concert_performers (concert_id, role, name, instrument)
             VALUES (?, 'soloist', ?, ?)`,
            [concertId, soloist.name.trim(), soloist.instrument || null]
          );
        }
      }
    }
    
    // Save program
    if (selected_works) {
      const worksList = JSON.parse(selected_works);
      for (let i = 0; i < worksList.length; i++) {
        await dbPromise.run(
          `INSERT INTO concert_program (concert_id, work_id, position)
           VALUES (?, ?, ?)`,
          [concertId, worksList[i], i + 1]
        );
      }
    }
    
    res.json({
      success: true,
      message: 'Concerto creato con successo',
      concert_id: concertId
    });
  } catch (error) {
    next(error);
  }
});

// PUT update concert
router.put('/concerts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      date,
      starts_at,
      location,
      slug,
      description_short,
      description_html,
      conductor_name,
      orchestra_name,
      soloists,
      selected_works,
      program_notes,
      program_details,
      poster_cloudinary_id,
      poster_local_filename,
      tags
    } = req.body;
    
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFuture = selectedDate >= today ? 1 : 0;
    
    await dbPromise.run(
      `UPDATE concerts SET
       title = ?, subtitle = ?, date = ?, starts_at = ?, location = ?,
       slug = ?, description_short = ?, description_html = ?,
       is_future = ?, program_notes = ?, program_details = ?,
       poster_cloudinary_id = ?, poster_local_filename = ?, tags = ?
       WHERE id = ?`,
      [
        title,
        subtitle || null,
        date,
        starts_at || '20:00',
        location,
        isFuture ? slug : null,
        description_short || null,
        description_html || null,
        isFuture,
        program_notes || null,
        program_details || null,
        poster_cloudinary_id || null,
        poster_local_filename || null,
        tags || null,
        id
      ]
    );
    
    // Update performers
    await dbPromise.run(
      'DELETE FROM concert_performers WHERE concert_id = ?',
      [id]
    );
    
    if (conductor_name) {
      await dbPromise.run(
        `INSERT INTO concert_performers (concert_id, role, name)
         VALUES (?, 'conductor', ?)`,
        [id, conductor_name]
      );
    }
    
    if (orchestra_name) {
      await dbPromise.run(
        `INSERT INTO concert_performers (concert_id, role, name)
         VALUES (?, 'orchestra', ?)`,
        [id, orchestra_name]
      );
    }
    
    if (soloists) {
      const soloistsList = JSON.parse(soloists);
      for (const soloist of soloistsList) {
        if (soloist.name && soloist.name.trim()) {
          await dbPromise.run(
            `INSERT INTO concert_performers (concert_id, role, name, instrument)
             VALUES (?, 'soloist', ?, ?)`,
            [id, soloist.name.trim(), soloist.instrument || null]
          );
        }
      }
    }
    
    // Update program
    await dbPromise.run(
      'DELETE FROM concert_program WHERE concert_id = ?',
      [id]
    );
    
    if (selected_works) {
      const worksList = JSON.parse(selected_works);
      for (let i = 0; i < worksList.length; i++) {
        await dbPromise.run(
          `INSERT INTO concert_program (concert_id, work_id, position)
           VALUES (?, ?, ?)`,
          [id, worksList[i], i + 1]
        );
      }
    }
    
    res.json({
      success: true,
      message: 'Concerto aggiornato con successo'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE concert
router.delete('/concerts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await dbPromise.run('DELETE FROM concert_performers WHERE concert_id = ?', [id]);
    await dbPromise.run('DELETE FROM concert_program WHERE concert_id = ?', [id]);
    await dbPromise.run('DELETE FROM concerts WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Concerto eliminato con successo'
    });
  } catch (error) {
    next(error);
  }
});

export default router;