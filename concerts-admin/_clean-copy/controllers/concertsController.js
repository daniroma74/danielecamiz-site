// concerts-admin/controllers/concertsController.js
import { dbPromise } from '../config/database.js';
import cloudinaryService from '../services/cloudinaryService.js';

class ConcertsController {
  
  /**
   * Lista concerti (Dashboard)
   */
  async list(req, res, next) {
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
      
      // Filtro temporale
      if (filter === 'future') {
        sql += ` AND (c.is_future = 1 OR date(c.date) >= date('now'))`;
      } else if (filter === 'past') {
        sql += ` AND c.is_future = 0 AND date(c.date) < date('now')`;
      }
      
      // Ricerca
      if (search) {
        sql += ` AND (c.title LIKE ? OR c.location LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }
      
      sql += ` ORDER BY c.date DESC`;
      
      const concerts = await dbPromise.all(sql, params);
      
      // Aggiungi URL poster per ogni concerto (usa poster_vertical_cloudinary)
      const concertsWithPosters = concerts.map(concert => {
        const verticalId = concert.poster_vertical_cloudinary;
        const horizontalId = concert.poster_horizontal_cloudinary;
        return {
          ...concert,
          posterUrl: cloudinaryService.getConcertPosterUrl(verticalId, 'medium'),
          posterUrls: cloudinaryService.getPosterUrls(verticalId),
          posterHorizontalUrl: cloudinaryService.getConcertHorizontalPosterUrl(horizontalId, 'medium'),
          hasVerticalPoster: !!verticalId,
          hasHorizontalPoster: !!horizontalId
        };
      });
      
      res.render('pages/dashboard', {
        title: 'Gestione Concerti',
        concerts: concertsWithPosters,
        filter,
        search,
        stagingUrl: process.env.STAGING_URL || 'https://staging.danielecamiz.com',
        eventsAdminUrl: process.env.EVENTS_ADMIN_URL || 'https://events-admin.danielecamiz.com',
        currentPage: 'concerts'
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Editor concerto (nuovo o modifica)
   */
  async editor(req, res, next) {
    try {
      const concertId = req.params.id;
      
      // Carica compositori e categorie per i dropdown
      const composers = await dbPromise.all('SELECT * FROM composers ORDER BY sort_key');
      const categories = await dbPromise.all('SELECT * FROM categories ORDER BY position');
      
      // Carica lista completa works per il selettore
      const works = await dbPromise.all(`
        SELECT w.*, c.full_name as composer_name
        FROM works w
        LEFT JOIN composers c ON w.composer_id = c.id
        ORDER BY c.sort_key, w.title
      `);
      
      let concert = null;
      let program = [];
      let performers = { conductor: '', orchestra: '', soloists: [] };
      
      if (concertId) {
        // Modifica concerto esistente
        concert = await dbPromise.get('SELECT * FROM concerts WHERE id = ?', [concertId]);
        
        if (!concert) {
          return res.status(404).render('errors/404', { message: 'Concerto non trovato' });
        }
        
        // Carica programma
        program = await dbPromise.all(`
          SELECT 
            cp.*,
            w.title as work_title,
            w.subtitle as work_subtitle,
            w.catalogue,
            c.full_name as composer_name
          FROM concert_program cp
          JOIN works w ON cp.work_id = w.id
          LEFT JOIN composers c ON w.composer_id = c.id
          WHERE cp.concert_id = ?
          ORDER BY cp.position
        `, [concertId]);
        
        // Carica performers dalla tabella concert_performers
        const performersData = await dbPromise.all(
          'SELECT * FROM concert_performers WHERE concert_id = ? ORDER BY role, name',
          [concertId]
        );
        
        performersData.forEach(p => {
          if (p.role === 'conductor') performers.conductor = p.name;
          else if (p.role === 'orchestra') performers.orchestra = p.name;
          else if (p.role === 'soloist') performers.soloists.push({ name: p.name, instrument: p.instrument || '' });
        });
        
        // Aggiungi URL poster
        const verticalId = concert.poster_vertical_cloudinary;
        const horizontalId = concert.poster_horizontal_cloudinary;
        concert.posterVerticalUrl = cloudinaryService.getConcertPosterUrl(verticalId, 'large');
        concert.posterHorizontalUrl = cloudinaryService.getConcertHorizontalPosterUrl(horizontalId, 'large');
        concert.verticalCloudinaryId = verticalId;
        concert.horizontalCloudinaryId = horizontalId;
      }
      
      res.render('pages/concert-editor', {
        title: concertId ? `Modifica: ${concert.title}` : 'Nuovo Concerto',
        concert,
        program,
        performers,
        composers,
        categories,
        works,
        cloudinaryConfig: cloudinaryService.getUploadConfig('poster_vertical_unsigned'),
        currentPage: 'concerts',
        stagingUrl: process.env.STAGING_URL || 'https://staging.danielecamiz.com',
        eventsAdminUrl: process.env.EVENTS_ADMIN_URL || 'https://events-admin.danielecamiz.com',
        isNew: !concertId
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Salva concerto (nuovo o aggiornamento)
   */
  async save(req, res, next) {
    try {
      const {
        id,
        title,
        subtitle,
        date,
        location,
        starts_at,
        poster_vertical_cloudinary,
        poster_horizontal_cloudinary,
        is_future,
        slug,
        description_html,
        description_short,
        conductor,
        orchestra,
        soloists,
        program
      } = req.body;
      
      if (!title || !date || !location) {
        return res.status(400).json({
          success: false,
          error: 'Campi obbligatori mancanti: title, date, location'
        });
      }
      
      const finalSlug = slug || this._generateSlug(title, date);
      
      const concertData = {
        title,
        subtitle: subtitle || null,
        date,
        location,
        starts_at: starts_at || '20:00',
        poster_vertical_cloudinary: poster_vertical_cloudinary || null,
        poster_horizontal_cloudinary: poster_horizontal_cloudinary || null,
        is_future: is_future === '1' || is_future === true ? 1 : 0,
        slug: finalSlug,
        description_html: description_html || null,
        description_short: description_short || null
      };
      
      let concertId;
      
      if (id) {
        await dbPromise.run(`
          UPDATE concerts SET
            title = ?, subtitle = ?, date = ?, location = ?,
            starts_at = ?, poster_vertical_cloudinary = ?, poster_horizontal_cloudinary = ?,
            is_future = ?, slug = ?, description_html = ?, description_short = ?
          WHERE id = ?
        `, [
          concertData.title, concertData.subtitle, concertData.date, concertData.location,
          concertData.starts_at, concertData.poster_vertical_cloudinary, concertData.poster_horizontal_cloudinary,
          concertData.is_future, concertData.slug, concertData.description_html, concertData.description_short,
          id
        ]);
        concertId = id;
      } else {
        const result = await dbPromise.run(`
          INSERT INTO concerts (
            title, subtitle, date, location, starts_at,
            poster_vertical_cloudinary, poster_horizontal_cloudinary, is_future, slug, description_html, description_short
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          concertData.title, concertData.subtitle, concertData.date, concertData.location,
          concertData.starts_at, concertData.poster_vertical_cloudinary, concertData.poster_horizontal_cloudinary,
          concertData.is_future, concertData.slug, concertData.description_html, concertData.description_short
        ]);
        concertId = result.lastID;
      }
      
      await this._savePerformers(concertId, { conductor, orchestra, soloists });
      
      if (program) {
        await this._saveProgram(concertId, typeof program === 'string' ? JSON.parse(program) : program);
      }
      
      res.json({
        success: true,
        message: id ? 'Concerto aggiornato' : 'Concerto creato',
        id: concertId,
        slug: finalSlug,
        landingUrl: concertData.is_future ? 
          `${process.env.EVENTS_ADMIN_URL || 'https://events-admin.danielecamiz.com'}/edit/${finalSlug}` : null
      });
      
    } catch (error) {
      console.error('Save concert error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  async deleteById(req, res, next) {
    try {
      const { id } = req.params;
      
      const concert = await dbPromise.get('SELECT title FROM concerts WHERE id = ?', [id]);
      if (!concert) {
        return res.status(404).json({ success: false, error: 'Concerto non trovato' });
      }
      
      await dbPromise.run('DELETE FROM concerts WHERE id = ?', [id]);
      
      res.json({
        success: true,
        message: `Concerto "${concert.title}" eliminato`
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  async searchBySoloist(req, res, next) {
    try {
      const { name } = req.query;
      
      if (!name) {
        return res.json({ success: true, concerts: [] });
      }
      
      const concerts = await dbPromise.all(`
        SELECT DISTINCT c.*
        FROM concerts c
        JOIN concert_performers cp ON c.id = cp.concert_id
        WHERE cp.role = 'soloist' AND cp.name LIKE ?
        ORDER BY c.date DESC
      `, [`%${name}%`]);
      
      res.json({ success: true, concerts });
      
    } catch (error) {
      next(error);
    }
  }
  
  async renderSearch(req, res, next) {
    try {
      res.render('pages/search', {
        title: 'Ricerca Avanzata',
        currentPage: 'search',
        stagingUrl: process.env.STAGING_URL || 'https://staging.danielecamiz.com'
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============ METODI PRIVATI ============
  
  async _savePerformers(concertId, { conductor, orchestra, soloists }) {
    await dbPromise.run('DELETE FROM concert_performers WHERE concert_id = ?', [concertId]);
    
    if (conductor) {
      await dbPromise.run(
        'INSERT INTO concert_performers (concert_id, role, name) VALUES (?, ?, ?)',
        [concertId, 'conductor', conductor]
      );
    }
    
    if (orchestra) {
      await dbPromise.run(
        'INSERT INTO concert_performers (concert_id, role, name) VALUES (?, ?, ?)',
        [concertId, 'orchestra', orchestra]
      );
    }
    
    if (soloists) {
      const soloistArray = typeof soloists === 'string' ? JSON.parse(soloists) : soloists;
      
      for (const soloist of soloistArray) {
        if (soloist.name) {
          await dbPromise.run(
            'INSERT INTO concert_performers (concert_id, role, name, instrument) VALUES (?, ?, ?, ?)',
            [concertId, 'soloist', soloist.name, soloist.instrument || null]
          );
        }
      }
    }
  }
  
  async _saveProgram(concertId, programItems) {
    await dbPromise.run('DELETE FROM concert_program WHERE concert_id = ?', [concertId]);
    
    for (const item of programItems) {
      if (item.work_id) {
        await dbPromise.run(
          'INSERT INTO concert_program (concert_id, work_id, position, first_time, notes) VALUES (?, ?, ?, ?, ?)',
          [concertId, item.work_id, item.position || 0, item.first_time || 0, item.notes || null]
        );
      }
    }
  }
  
  _generateSlug(title, date) {
    const dateStr = new Date(date).toISOString().split('T')[0];
    const titleSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return `${dateStr}-${titleSlug}`;
  }
}

export default ConcertsController;