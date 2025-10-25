// concerts-admin/routes/api.js
import { Router } from 'express';
import RepertoireController from '../controllers/repertoireController.js';
import { dbPromise } from '../config/database.js';

const router = Router();
const repertoireController = new RepertoireController();

// ========== REPERTOIRE ==========

router.get('/repertoire/search', (req, res, next) => 
  repertoireController.search(req, res, next)
);

router.get('/repertoire/works/:workId/movements', (req, res, next) => 
  repertoireController.getMovementsByWork(req, res, next)
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

// ========== CONCERTS ==========

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

router.get('/concerts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
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
    
    const performers = await dbPromise.all(
      'SELECT role, name, instrument FROM concert_performers WHERE concert_id = ?',
      [id]
    );
    
    const conductor = performers.find(p => p.role === 'conductor');
    const orchestra = performers.find(p => p.role === 'orchestra');
    const soloists = performers.filter(p => p.role === 'soloist');
    
    const program = await dbPromise.all(
      `SELECT 
         w.id, w.title, w.subtitle, w.catalogue,
         m.id as movement_id,
         m.title as movement_title, 
         m.tempo as movement_tempo,
         m.movement_number,
         cp.position as program_position,
         c.full_name as composer_name
       FROM concert_program cp
       JOIN works w ON cp.work_id = w.id
       LEFT JOIN movements m ON cp.movement_id = m.id
       LEFT JOIN composers c ON w.composer_id = c.id
       WHERE cp.concert_id = ?
       ORDER BY cp.position`,
      [id]
    );
    
    const response = {
      ...concert,
      conductor_name: conductor ? conductor.name : '',
      orchestra_name: orchestra ? orchestra.name : '',
      soloists: soloists.map(s => ({
        name: s.name,
        instrument: s.instrument || ''
      })),
      program: program.map(item => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        composer_name: item.composer_name,
        catalogue: item.catalogue,
        movement_id: item.movement_id,
        movement_title: item.movement_title,
        movement_tempo: item.movement_tempo,
        movement_number: item.movement_number
      }))
    };
    
    res.json({ success: true, concert: response });
  } catch (error) {
    next(error);
  }
});

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
      poster_vertical_cloudinary,
      poster_horizontal_cloudinary,
      tags
    } = req.body;
    
    if (!title || !date || !location) {
      return res.status(400).json({
        success: false,
        error: 'Campi obbligatori: title, date, location'
      });
    }
    
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFuture = selectedDate >= today ? 1 : 0;
    
    const result = await dbPromise.run(
      `INSERT INTO concerts 
       (title, subtitle, date, starts_at, location, slug, 
        description_short, description_html,
        is_future, program_notes, program_details,
        poster_vertical_cloudinary, poster_horizontal_cloudinary, tags)
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
        poster_vertical_cloudinary || null,
        poster_horizontal_cloudinary || null,
        tags || null
      ]
    );
    
    const concertId = result.lastID;
    
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
      const soloistsList = typeof soloists === 'string' ? JSON.parse(soloists) : soloists;
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
    
    if (selected_works) {
      const worksList = typeof selected_works === 'string' ? JSON.parse(selected_works) : selected_works;
      for (let i = 0; i < worksList.length; i++) {
        const item = worksList[i];
        await dbPromise.run(
          `INSERT INTO concert_program (concert_id, work_id, movement_id, position)
           VALUES (?, ?, ?, ?)`,
          [
            concertId, 
            item.work_id || item.id,
            item.movement_id || null, 
            i + 1
          ]
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

router.put('/concerts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (Object.keys(req.body).length === 1 && req.body.poster_vertical_cloudinary) {
      await dbPromise.run(
        'UPDATE concerts SET poster_vertical_cloudinary = ? WHERE id = ?',
        [req.body.poster_vertical_cloudinary, id]
      );
      
      return res.json({
        success: true,
        message: 'Poster aggiornato con successo'
      });
    }
    
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
      poster_vertical_cloudinary,
      poster_horizontal_cloudinary,
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
       poster_vertical_cloudinary = ?, poster_horizontal_cloudinary = ?, tags = ?
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
        poster_vertical_cloudinary || null,
        poster_horizontal_cloudinary || null,
        tags || null,
        id
      ]
    );
    
    // Cancella performers esistenti
    await dbPromise.run('DELETE FROM concert_performers WHERE concert_id = ?', [id]);
    
    // Mappa per solisti: nome -> ID
    const soloistIdMap = new Map();
    
    if (conductor_name) {
      await dbPromise.run(
        `INSERT INTO concert_performers (concert_id, role, name) VALUES (?, 'conductor', ?)`,
        [id, conductor_name]
      );
    }
    
    if (orchestra_name) {
      await dbPromise.run(
        `INSERT INTO concert_performers (concert_id, role, name) VALUES (?, 'orchestra', ?)`,
        [id, orchestra_name]
      );
    }
    
    // Inserisci solisti e salva mapping
    if (soloists) {
      const soloistsList = typeof soloists === 'string' ? JSON.parse(soloists) : soloists;
      for (const soloist of soloistsList) {
        if (soloist.name && soloist.name.trim()) {
          const result = await dbPromise.run(
            `INSERT INTO concert_performers (concert_id, role, name, instrument) VALUES (?, 'soloist', ?, ?)`,
            [id, soloist.name.trim(), soloist.instrument || null]
          );
          
          // Salva mapping nome -> ID
          soloistIdMap.set(soloist.name.trim(), result.lastID);
          console.log(`✅ Solista inserito: ${soloist.name} -> ID ${result.lastID}`);
        }
      }
    }
    
    // Cancella programma esistente
    await dbPromise.run('DELETE FROM concert_program WHERE concert_id = ?', [id]);
    
    // Inserisci programma con soloist_id
    if (selected_works) {
      const worksList = typeof selected_works === 'string' ? JSON.parse(selected_works) : selected_works;
      for (let i = 0; i < worksList.length; i++) {
        const item = worksList[i];
        
        let soloistId = null;
        if (item.soloist_id) {
          if (typeof item.soloist_id === 'number') {
            soloistId = item.soloist_id;
          } else if (typeof item.soloist_id === 'string') {
            soloistId = soloistIdMap.get(item.soloist_id) || null;
          }
        }
        
        console.log(`📋 Brano ${i + 1}: work_id=${item.work_id}, soloist_id=${soloistId}`);
        
        await dbPromise.run(
          `INSERT INTO concert_program (concert_id, work_id, movement_id, position, soloist_id) VALUES (?, ?, ?, ?, ?)`,
          [
            id, 
            item.work_id || item.id, 
            item.movement_id || null, 
            i + 1,
            soloistId
          ]
        );
      }
    }
    
    res.json({
      success: true,
      message: 'Concerto aggiornato con successo'
    });
  } catch (error) {
    console.error('❌ Errore PUT /concerts/:id:', error);
    next(error);
  }
});

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