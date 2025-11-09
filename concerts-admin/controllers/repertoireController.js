// concerts-admin/controllers/repertoireController.js
import { dbPromise } from '../config/database.js';

class RepertoireController {
  
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      
      const work = await dbPromise.get(`
        SELECT w.*, 
               c.full_name as composer_name,
               c.short_name as composer_short,
               cat.label_it as category_name
        FROM works w
        LEFT JOIN composers c ON w.composer_id = c.id
        LEFT JOIN categories cat ON w.category_id = cat.id
        WHERE w.id = ?
      `, [id]);
      
      if (!work) {
        return res.status(404).json({ success: false, error: 'Brano non trovato' });
      }
      
      res.json({
        success: true,
        work: work
      });
    } catch (error) {
      next(error);
    }
  }
  
  async search(req, res, next) {
    try {
      const query = req.query.q || '';
      const limit = req.query.limit || 20;
      
      if (query.length < 2) {
        const works = await dbPromise.all(`
          SELECT w.id, w.title, w.catalogue, w.work_key, w.composer_id,
                 c.full_name as composer_name,
                 c.short_name as composer_short
          FROM works w
          LEFT JOIN composers c ON w.composer_id = c.id
          ORDER BY c.sort_key, w.title
          LIMIT ?
        `, [limit]);
        return res.json({ success: true, works });
      }
      
      const works = await dbPromise.all(`
        SELECT w.id, w.title, w.catalogue, w.work_key, w.composer_id,
               c.full_name as composer_name,
               c.short_name as composer_short
        FROM works w
        LEFT JOIN composers c ON w.composer_id = c.id
        WHERE w.title LIKE ? 
           OR c.full_name LIKE ?
           OR w.catalogue LIKE ?
        ORDER BY c.sort_key, w.title
        LIMIT ?
      `, [`%${query}%`, `%${query}%`, `%${query}%`, limit]);
      
      res.json({ success: true, works });
    } catch (error) {
      next(error);
    }
  }
  
  async save(req, res, next) {
    try {
      const { id } = req.params;
      const {
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
      
      if (!composer_id || !title) {
        return res.status(400).json({
          success: false,
          error: 'composer_id e title sono obbligatori'
        });
      }
      
      const workData = {
        composer_id: parseInt(composer_id),
        category_id: category_id ? parseInt(category_id) : null,
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
        res.json({ success: true, message: 'Brano aggiornato con successo', work_id: workId });
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
        res.json({ success: true, message: 'Brano creato con successo', work_id: workId });
      }
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
          error: `Impossibile eliminare: il brano è usato in ${usage.count} concerti`
        });
      }
      
      await dbPromise.run('DELETE FROM movements WHERE work_id = ?', [id]);
      await dbPromise.run('DELETE FROM works WHERE id = ?', [id]);
      
      res.json({ success: true, message: 'Brano eliminato con successo' });
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
  
  async createMovement(req, res, next) {
    try {
      const {
        work_id,
        position,
        title,
        tempo,
        duration,
        notes
      } = req.body;
      
      if (!work_id) {
        return res.status(400).json({
          success: false,
          error: 'work_id obbligatorio'
        });
      }
      
      const result = await dbPromise.run(
        `INSERT INTO movements 
         (work_id, movement_number, title, tempo, duration_minutes, notes_it)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          parseInt(work_id),
          position || 1,
          title || null,
          tempo || null,
          duration || null,
          notes || null
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
      const { title, tempo, duration, notes } = req.body;
      
      await dbPromise.run(
        `UPDATE movements SET
         title = ?, tempo = ?, duration_minutes = ?, notes_it = ?
         WHERE id = ?`,
        [
          title || null,
          tempo || null,
          duration || null,
          notes || null,
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
        'SELECT COUNT(*) as count FROM concert_program WHERE movement_id = ?',
        [id]
      );
      
      if (usage.count > 0) {
        return res.status(400).json({
          success: false,
          error: `Impossibile eliminare: movimento usato in ${usage.count} concerti`
        });
      }
      
      await dbPromise.run('DELETE FROM movements WHERE id = ?', [id]);
      
      res.json({ success: true, message: 'Movimento eliminato con successo' });
    } catch (error) {
      next(error);
    }
  }

  async getConcertsByWork(req, res, next) {
    try {
      const { workId } = req.params;

      // Query per ottenere tutti i concerti che includono questo brano
      const concerts = await dbPromise.all(`
        SELECT DISTINCT
          c.id,
          c.title,
          c.date,
          c.location,
          c.is_future,
          w.title as work_title,
          w.catalogue,
          cp.movement_id,
          m.movement_number,
          m.title as movement_title
        FROM concerts c
        INNER JOIN concert_program cp ON c.id = cp.concert_id
        INNER JOIN works w ON cp.work_id = w.id
        LEFT JOIN movements m ON cp.movement_id = m.id
        WHERE w.id = ?
        ORDER BY c.date DESC, c.id DESC
      `, [workId]);

      res.json({
        success: true,
        concerts: concerts
      });
    } catch (error) {
      next(error);
    }
  }
}

export default RepertoireController;