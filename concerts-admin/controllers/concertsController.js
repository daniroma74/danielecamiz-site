// concerts-admin/controllers/concertsController.js
import { dbPromise } from '../config/database.js';
import cloudinaryService from '../services/cloudinaryService.js';

class ConcertsController {
  
  async renderDashboard(req, res, next) {
    try {
      const filter = req.query.filter || 'all';
      const search = req.query.search || '';
      
      let sql = `
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM concert_program WHERE concert_id = c.id) as program_count,
          (SELECT COUNT(*) FROM concert_performers WHERE concert_id = c.id AND role = 'soloist') as soloists_count
        FROM concerts c
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filter === 'future') {
        sql += ` AND date(c.date) >= date('now')`;
      } else if (filter === 'past') {
        sql += ` AND date(c.date) < date('now')`;
      }
      
      if (search) {
        sql += ` AND (c.title LIKE ? OR c.location LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }
      
      sql += ` ORDER BY c.date DESC`;
      
      const concerts = await dbPromise.all(sql, params);
      
      const concertsWithPosters = concerts.map(concert => {
        let posterUrl = null;
        if (concert.poster_vertical_cloudinary && concert.poster_vertical_cloudinary.trim() !== '') {
          posterUrl = `https://res.cloudinary.com/dnwhnz2xy/image/upload/c_fill,w_400,h_533,g_center/${concert.poster_vertical_cloudinary}`;
        }
        return {
          ...concert,
          posterUrl
        };
      });
      
      res.render('pages/dashboard', {
        title: 'Dashboard Concerti',
        currentPage: 'dashboard',
        concerts: concertsWithPosters,
        filter,
        search,
        stagingUrl: process.env.STAGING_URL || 'https://www.danielecamiz.com',
        eventsAdminUrl: process.env.EVENTS_ADMIN_URL || 'https://events-admin.danielecamiz.com'
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  async renderRepertoire(req, res, next) {
    try {
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
        total_works: { count: works.length },
        total_composers: await dbPromise.get('SELECT COUNT(DISTINCT id) as count FROM composers'),
        total_categories: await dbPromise.get('SELECT COUNT(*) as count FROM categories')
      };
      
      res.render('pages/repertoire', {
        title: 'Gestione Repertorio',
        currentPage: 'repertoire',
        works,
        composers,
        categories,
        stats,
        filters: { search, composer, category },
        stagingUrl: process.env.STAGING_URL || 'https://www.danielecamiz.com'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async renderEditor(req, res, next) {
    try {
      const concertId = req.params.id;
      
      const composers = await dbPromise.all('SELECT * FROM composers ORDER BY sort_key');
      const categories = await dbPromise.all('SELECT * FROM categories ORDER BY position');
      
      const allWorks = await dbPromise.all(`
        SELECT w.*, c.full_name as composer_name
        FROM works w
        LEFT JOIN composers c ON w.composer_id = c.id
        ORDER BY c.sort_key, w.title
      `);
      
      let concert = null;
      let selectedWorks = [];
      let soloists = [];
      let conductor = '';
      let orchestra = '';
      
      if (concertId) {
        concert = await dbPromise.get('SELECT * FROM concerts WHERE id = ?', [concertId]);
        
        if (!concert) {
          return res.status(404).render('errors/404', { message: 'Concerto non trovato' });
        }
        
        // Query programma CON soloist_id
        const program = await dbPromise.all(`
          SELECT 
            cp.*,
            w.id as work_id,
            w.title as work_title,
            w.catalogue,
            m.id as movement_id,
            m.title as movement_title,
            m.movement_number,
            m.tempo,
            c.full_name as composer_name,
            cp.soloist_id
          FROM concert_program cp
          JOIN works w ON cp.work_id = w.id
          LEFT JOIN movements m ON cp.movement_id = m.id
          LEFT JOIN composers c ON w.composer_id = c.id
          WHERE cp.concert_id = ?
          ORDER BY cp.position
        `, [concertId]);
        
        // Mappatura programma
        selectedWorks = program.map(item => {
          let movementTitle = null;
          if (item.movement_id && item.movement_number != null) {
            let parts = [`${item.movement_number}.`];
            if (item.movement_title) parts.push(item.movement_title);
            if (item.tempo) parts.push(`(${item.tempo})`);
            movementTitle = parts.join(' ');
          }
          
          return {
            id: item.work_id,
            title: item.work_title,
            composer_name: item.composer_name,
            catalogue: item.catalogue,
            movement_id: item.movement_id,
            movement_title: movementTitle,
            soloist_id: item.soloist_id
          };
        });
        
        // Carica performers CON id
        const performersData = await dbPromise.all(
          'SELECT id, role, name, instrument FROM concert_performers WHERE concert_id = ? ORDER BY role, name',
          [concertId]
        );
        
        performersData.forEach(p => {
          if (p.role === 'conductor') conductor = p.name;
          else if (p.role === 'orchestra') orchestra = p.name;
          else if (p.role === 'soloist') {
            soloists.push({ 
              id: p.id,
              name: p.name, 
              instrument: p.instrument || '' 
            });
          }
        });
        
        // Poster URLs
        if (concert.poster_vertical_cloudinary && concert.poster_vertical_cloudinary.trim() !== '') {
          concert.posterVerticalUrl = `https://res.cloudinary.com/dnwhnz2xy/image/upload/c_fill,w_300,h_400,g_center/${concert.poster_vertical_cloudinary}`;
        }
        if (concert.poster_horizontal_cloudinary && concert.poster_horizontal_cloudinary.trim() !== '') {
          concert.posterHorizontalUrl = `https://res.cloudinary.com/dnwhnz2xy/image/upload/c_fill,w_600,h_400,g_center/${concert.poster_horizontal_cloudinary}`;
        }
      }
      
      res.render('pages/concert-editor', {
        title: concertId ? `Modifica: ${concert.title}` : 'Nuovo Concerto',
        currentPage: 'editor',
        concert,
        selectedWorks: JSON.stringify(selectedWorks),
        soloists: JSON.stringify(soloists),
        conductor,
        orchestra,
        composers,
        categories,
        allWorks,
        cloudinaryConfig: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dnwhnz2xy',
          uploadPreset: 'poster_vertical_unsigned'
        },
        stagingUrl: process.env.STAGING_URL || 'https://www.danielecamiz.com',
        eventsAdminUrl: process.env.EVENTS_ADMIN_URL || 'https://events-admin.danielecamiz.com',
        isNew: !concertId
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  async deleteById(req, res, next) {
    try {
      const { id } = req.params;
      
      const concert = await dbPromise.get('SELECT title FROM concerts WHERE id = ?', [id]);
      if (!concert) {
        return res.status(404).json({ success: false, error: 'Concerto non trovato' });
      }
      
      await dbPromise.run('DELETE FROM concert_performers WHERE concert_id = ?', [id]);
      await dbPromise.run('DELETE FROM concert_program WHERE concert_id = ?', [id]);
      await dbPromise.run('DELETE FROM concerts WHERE id = ?', [id]);
      
      res.json({
        success: true,
        message: `Concerto "${concert.title}" eliminato`
      });
      
    } catch (error) {
      next(error);
    }
  }
}

export default ConcertsController;