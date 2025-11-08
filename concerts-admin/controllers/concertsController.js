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

      // Raggruppa i concerti per categoria
      const futureConcerts = concertsWithPosters.filter(c => c.is_future === 1 || new Date(c.date) >= new Date());
      const pastConcerts = concertsWithPosters.filter(c => c.is_future === 0 && new Date(c.date) < new Date());

      // Raggruppa i concerti passati per anno
      const concertsByYear = {};
      pastConcerts.forEach(concert => {
        const year = new Date(concert.date).getFullYear();
        if (!concertsByYear[year]) {
          concertsByYear[year] = [];
        }
        concertsByYear[year].push(concert);
      });

      // Converti in array ordinato (anni più recenti prima)
      const yearGroups = Object.keys(concertsByYear)
        .sort((a, b) => b - a)
        .map(year => ({
          year: parseInt(year),
          concerts: concertsByYear[year]
        }));

      res.render('pages/dashboard', {
        title: 'Dashboard Concerti',
        currentPage: 'dashboard',
        futureConcerts,
        yearGroups,
        filter,
        search,
        stagingUrl: process.env.STAGING_URL || 'https://www.danielecamiz.com',
        eventsAdminUrl: process.env.EVENTS_ADMIN_URL || 'https://events-admin.danielecamiz.com'
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  async renderPerformers(req, res, next) {
    try {
      // Query per ottenere tutti i solisti, orchestre e cori con conteggio concerti
      const performers = await dbPromise.all(`
        SELECT
          cp.name,
          cp.role,
          cp.instrument,
          COUNT(cp.concert_id) as concert_count,
          MIN(c.date) as first_concert,
          MAX(c.date) as last_concert,
          GROUP_CONCAT(c.id || '|||' || c.title || '|||' || c.date, '§§§') as concerts_list
        FROM concert_performers cp
        JOIN concerts c ON cp.concert_id = c.id
        WHERE cp.role IN ('soloist', 'chorus', 'orchestra')
        GROUP BY cp.name, cp.role, cp.instrument
        ORDER BY cp.role, concert_count DESC, cp.name
      `);

      // Processa la lista dei concerti per ogni performer
      const processedPerformers = performers.map(p => {
        const concerts = p.concerts_list ? p.concerts_list.split('§§§').map(c => {
          const [id, title, date] = c.split('|||');
          return { id, title, date };
        }) : [];
        return {
          ...p,
          concerts: concerts
        };
      });

      // Raggruppa per tipo
      const soloists = processedPerformers.filter(p => p.role === 'soloist');
      const choruses = processedPerformers.filter(p => p.role === 'chorus');
      const orchestras = processedPerformers.filter(p => p.role === 'orchestra');

      const stats = {
        total_soloists: soloists.length,
        total_choruses: choruses.length,
        total_orchestras: orchestras.length
      };

      res.render('pages/performers', {
        title: 'Solisti & Ensemble',
        currentPage: 'performers',
        soloists,
        choruses,
        orchestras,
        stats,
        stagingUrl: process.env.STAGING_URL || 'https://www.danielecamiz.com'
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
               c.id as composer_id,
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

      // Group works by composer if no specific filters are applied
      let composerGroups = [];
      if (!search && !composer && !category) {
        const worksByComposer = {};
        works.forEach(work => {
          const composerId = work.composer_id;
          if (!worksByComposer[composerId]) {
            worksByComposer[composerId] = {
              composer_id: composerId,
              composer_name: work.composer_name,
              composer_short: work.composer_short,
              works: []
            };
          }
          worksByComposer[composerId].works.push(work);
        });

        // Convert to array and keep order (already sorted by sort_key)
        composerGroups = Object.values(worksByComposer);
      }

      res.render('pages/repertoire', {
        title: 'Gestione Repertorio',
        currentPage: 'repertoire',
        works,
        composerGroups,
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
      let chorus = '';
      
      if (concertId) {
        concert = await dbPromise.get('SELECT * FROM concerts WHERE id = ?', [concertId]);
        
        if (!concert) {
          return res.status(404).render('errors/404', { message: 'Concerto non trovato' });
        }
        
        // Query programma CON subtitle
        const program = await dbPromise.all(`
          SELECT
            cp.*,
            w.id as work_id,
            w.title as work_title,
            w.subtitle as work_subtitle,
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
        
        // Mappatura programma con soloist_ids dalla tabella di join
        selectedWorks = await Promise.all(program.map(async (item) => {
          let movementTitle = null;
          if (item.movement_id && item.movement_number != null) {
            let parts = [`${item.movement_number}.`];
            if (item.movement_title) parts.push(item.movement_title);
            if (item.tempo) parts.push(`(${item.tempo})`);
            movementTitle = parts.join(' ');
          }

          // Carica solisti per questo item dal programma
          const itemSoloists = await dbPromise.all(
            `SELECT performer_id FROM concert_program_soloists WHERE program_item_id = ?`,
            [item.id]
          );

          return {
            id: item.work_id,
            title: item.work_title,
            subtitle: item.work_subtitle,
            composer_name: item.composer_name,
            catalogue: item.catalogue,
            movement_id: item.movement_id,
            movement_title: movementTitle,
            soloist_ids: itemSoloists.map(s => s.performer_id)
          };
        }));
        
        // Carica performers CON id
        const performersData = await dbPromise.all(
          'SELECT id, role, name, instrument FROM concert_performers WHERE concert_id = ? ORDER BY role, name',
          [concertId]
        );
        
        performersData.forEach(p => {
          if (p.role === 'conductor') conductor = p.name;
          else if (p.role === 'orchestra') orchestra = p.name;
          else if (p.role === 'chorus') {
            chorus = p.name; // Salva il nome del coro
            // NON aggiungiamo il coro alla lista soloists per evitare duplicazioni
            // Il coro viene gestito separatamente tramite il campo chorus_name
          }
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
        chorus,
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