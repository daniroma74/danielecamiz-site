// concerts-admin/controllers/repertoireController.js
import { dbPromise } from '../config/database.js';

class RepertoireController {
  
  async list(req, res, next) {
    try {
      const filter = req.query.filter || 'all';
      const search = req.query.search || '';
      const composer = req.query.composer || '';
      const category = req.query.category || '';
      
      let query = `
        SELECT w.*, 
               c.full_name as composer_name,
               c.short_name as composer_short,
               cat.label_it as category_label,
               COUNT(DISTINCT CASE WHEN conc.is_future = 0 THEN cp.concert_id END) as past_count,
               COUNT(DISTINCT CASE WHEN conc.is_future = 1 THEN cp.concert_id END) as future_count
        FROM works w
        LEFT JOIN composers c ON w.composer_id = c.id
        LEFT JOIN categories cat ON w.category_id = cat.id
        LEFT JOIN concert_program cp ON w.id = cp.work_id
        LEFT JOIN concerts conc ON cp.concert_id = conc.id
        WHERE 1=1
      `;
      let params = [];
      
      if (search) {
        query += ' AND (w.title LIKE ? OR c.full_name LIKE ? OR w.catalogue LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      if (composer) {
        query += ' AND w.composer_id = ?';
        params.push(composer);
      }
      
      if (category) {
        query += ' AND w.category_id = ?';
        params.push(category);
      }
      
      query += ' GROUP BY w.id ORDER BY c.sort_key, w.title';
      
      const works = await dbPromise.all(query, params);
      
      const composers = await dbPromise.all(
        'SELECT * FROM composers ORDER BY sort_key, full_name'
      );
      
      const categories = await dbPromise.all(
        'SELECT * FROM categories ORDER BY position, label_it'
      );
      
      const stats = {
        total_works: works.length,
        total_composers: await dbPromise.get('SELECT COUNT(DISTINCT id) as count FROM composers'),
        total_categories: await dbPromise.get('SELECT COUNT(*) as count FROM categories')
      };
      
      res.render('pages/repertoire', {
        title: 'Gestione Repertorio',
        works,
        composers,
        categories,
        stats,
        filters: { search, composer, category }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      
      const work = await dbPromise.get(`
        SELECT w.*, 
               c.full_name as composer_name,
               c.short_name as composer_short,
               cat.label_it as category_label
        FROM works w
        LEFT JOIN composers c ON w.composer_id = c.id
        LEFT JOIN categories cat ON w.category_id = cat.id
        WHERE w.id = ?
      `, [id]);
      
      if (!work) {
        return res.status(404).json({ success: false, error: 'Brano non trovato' });
      }
      
      const movements = await dbPromise.all(
        'SELECT * FROM movements WHERE work_id = ? ORDER BY movement_number',
        [id]
      );
      
      const performances = await dbPromise.all(`
        SELECT c.date, c.location, c.title as concert_title
        FROM concert_program cp
        JOIN concerts c ON cp.concert_id = c.id
        WHERE cp.work_id = ?
        ORDER BY c.date DESC
      `, [id]);
      
      res.json({
        success: true,
        work: {
          ...work,
          movements,
          performances
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async search(req, res, next) {
    try {
      const query = req.query.q || '';
      
      if (query.length < 2) {
        return res.json({ success: true, works: [] });
      }
      
      const works = await dbPromise.all(`
        SELECT w.id, w.title, w.catalogue, w.work_key,
               c.full_name as composer_name,
               c.short_name as composer_short
        FROM works w
        LEFT JOIN composers c ON w.composer_id = c.id
        WHERE w.title LIKE ? 
           OR c.full_name LIKE ?
           OR w.catalogue LIKE ?
        ORDER BY c.sort_key, w.title
        LIMIT 20
      `, [`%${query}%`, `%${query}%`, `%${query}%`]);
      
      res.json({ success: true, works });
    } catch (error) {
      next(error);
    }
  }
  
  async save(req, res, next) {
    try {
      const {
        id,
        composer_id,
        category_id,
        title,
        subtitle,
        catalogue,
        work_key,
        year,
        notes_it,
        notes_en,
        media_video,
        media_audio
      } = req.body;
      
      const workData = {
        composer_id: parseInt(composer_id),
        category_id: parseInt(category_id),
        title,
        subtitle: subtitle || null,
        catalogue: catalogue || null,
        work_key: work_key || null,
        year: year ? parseInt(year) : null,
        notes_it: notes_it || null,
        notes_en: notes_en || null,
        media_video: media_video || null,
        media_audio: media_audio || null
      };
      
      let workId;
      
      if (id) {
        await dbPromise.run(
          `UPDATE works SET 
           composer_id = ?, category_id = ?, title = ?, subtitle = ?,
           catalogue = ?, work_key = ?, year = ?,
           notes_it = ?, notes_en = ?,
           media_video = ?, media_audio = ?
           WHERE id = ?`,
          [
            workData.composer_id, workData.category_id, workData.title, workData.subtitle,
            workData.catalogue, workData.work_key, workData.year,
            workData.notes_it, workData.notes_en,
            workData.media_video, workData.media_audio, id
          ]
        );
        workId = id;
      } else {
        const result = await dbPromise.run(
          `INSERT INTO works 
           (composer_id, category_id, title, subtitle, catalogue, work_key, year, 
            notes_it, notes_en, media_video, media_audio)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workData.composer_id, workData.category_id, workData.title, workData.subtitle,
            workData.catalogue, workData.work_key, workData.year,
            workData.notes_it, workData.notes_en,
            workData.media_video, workData.media_audio
          ]
        );
        workId = result.lastID;
      }
      
      res.json({ success: true, message: 'Brano salvato con successo', work_id: workId });
    } catch (error) {
      next(error);
    }
  }
  
  async deleteById(req, res, next) {
    try {
      const { id } = req.params;
      
      const usage = await dbPromise.get(
        'SELECT COUNT(*) as count FROM concert_program WHERE work_id = ?',
        [id]
      );
      
      if (usage.count > 0) {
        return res.status(400).json({
          success: false,
          message: `Impossibile eliminare: il brano è usato in ${usage.count} concerti`
        });
      }
      
      await dbPromise.run('DELETE FROM movements WHERE work_id = ?', [id]);
      await dbPromise.run('DELETE FROM works WHERE id = ?', [id]);
      
      res.json({ success: true, message: 'Brano eliminato con successo' });
    } catch (error) {
      next(error);
    }
  }
  
  async createMovement(req, res, next) {
    try {
      const {
        work_id,
        movement_number,
        title,
        tempo,
        duration_minutes,
        notes_it,
        notes_en
      } = req.body;
      
      if (!work_id || !movement_number) {
        return res.status(400).json({
          success: false,
          error: 'work_id e movement_number obbligatori'
        });
      }
      
      const existing = await dbPromise.get(
        'SELECT id FROM movements WHERE work_id = ? AND movement_number = ?',
        [work_id, movement_number]
      );
      
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Movimento già esistente per questo brano'
        });
      }
      
      const result = await dbPromise.run(
        `INSERT INTO movements 
         (work_id, movement_number, title, tempo, duration_minutes, notes_it, notes_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(work_id),
          parseInt(movement_number),
          title || null,
          tempo || null,
          duration_minutes ? parseInt(duration_minutes) : null,
          notes_it || null,
          notes_en || null
        ]
      );
      
      res.json({
        success: true,
        message: 'Movimento creato con successo',
        movement_id: result.lastID
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateMovement(req, res, next) {
    try {
      const { id } = req.params;
      const { title, tempo, duration_minutes, notes_it, notes_en } = req.body;
      
      await dbPromise.run(
        `UPDATE movements SET
         title = ?, tempo = ?, duration_minutes = ?,
         notes_it = ?, notes_en = ?
         WHERE id = ?`,
        [
          title || null,
          tempo || null,
          duration_minutes ? parseInt(duration_minutes) : null,
          notes_it || null,
          notes_en || null,
          id
        ]
      );
      
      res.json({ success: true, message: 'Movimento aggiornato con successo' });
    } catch (error) {
      next(error);
    }
  }
  
  async deleteMovement(req, res, next) {
    try {
      const { id } = req.params;
      
      const usage = await dbPromise.get(
        'SELECT COUNT(*) as count FROM concert_program_items WHERE movement_id = ?',
        [id]
      );
      
      if (usage.count > 0) {
        return res.status(400).json({
          success: false,
          message: `Impossibile eliminare: movimento usato in ${usage.count} concerti`
        });
      }
      
      await dbPromise.run('DELETE FROM movements WHERE id = ?', [id]);
      
      res.json({ success: true, message: 'Movimento eliminato con successo' });
    } catch (error) {
      next(error);
    }
  }
  
  async getMovementsByWork(req, res, next) {
    try {
      const { workId } = req.params;
      
      const movements = await dbPromise.all(
        'SELECT * FROM movements WHERE work_id = ? ORDER BY movement_number',
        [workId]
      );
      
      res.json({ success: true, movements });
    } catch (error) {
      next(error);
    }
  }
}

export default RepertoireController;