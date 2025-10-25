// landing/controllers/archiveController.js
import { getOne, queryDB } from '../config/database.js';

export async function renderArchive(req, res) {
  try {
    const db = req.app.locals.db;
    
    const concerts = await queryDB(db, `
      SELECT c.*,
             (SELECT COUNT(*) FROM bookings WHERE event_id = c.id AND status = 'confirmed') as booking_count,
             (SELECT SUM(seats) FROM bookings WHERE event_id = c.id AND status = 'confirmed') as total_seats
      FROM concerts c
      WHERE c.is_future = 0
      ORDER BY c.date DESC
      LIMIT 100
    `);
    
    res.render('pages/admin/archive', {
      concerts,
      title: 'Archivio Eventi Passati'
    });
    
  } catch (error) {
    console.error('Archive error:', error);
    res.status(500).send('Errore caricamento archivio');
  }
}

export async function renderArchivedEvent(req, res) {
  try {
    const db = req.app.locals.db;
    const slug = req.params.slug;
    
    const concert = await getOne(db, 
      'SELECT * FROM concerts WHERE slug = ? AND is_future = 0', 
      [slug]
    );
    
    if (!concert) {
      return res.status(404).render('pages/error', {
        message: 'Evento non trovato in archivio',
        title: 'Non trovato'
      });
    }
    
    const landingSettings = await getOne(db,
      'SELECT * FROM landing_settings WHERE concert_id = ?',
      [concert.id]
    ) || {};
    
    const performers = await queryDB(db,
      'SELECT role, name, instrument FROM concert_performers WHERE concert_id = ?',
      [concert.id]
    );
    
    const program = await queryDB(db,
      `SELECT w.title, w.subtitle, w.catalogue, w.work_key, c.full_name as composer 
       FROM concert_program cp
       JOIN works w ON cp.work_id = w.id
       JOIN composers c ON w.composer_id = c.id
       WHERE cp.concert_id = ?
       ORDER BY cp.position`,
      [concert.id]
    );
    
    const bookingStats = await getOne(db,
      'SELECT COUNT(*) as count, SUM(seats) as seats FROM bookings WHERE event_id = ? AND status = "confirmed"',
      [concert.id]
    );
    
    const eventData = {
      ...concert,
      ...landingSettings,
      performers: {
        conductor: performers.find(p => p.role === 'conductor')?.name || null,
        orchestra: performers.find(p => p.role === 'orchestra')?.name || null,
        soloists: performers.filter(p => p.role === 'soloist')
      },
      program,
      bookingStats: {
        count: bookingStats?.count || 0,
        seats: bookingStats?.seats || 0
      },
      isArchived: true
    };
    
    res.render('pages/archived-landing', {
  archive: eventData,  // ← Cambia da 'event' a 'archive'
  title: `${concert.title} - Archivio`
});
    
  } catch (error) {
    console.error('Archived event error:', error);
    res.status(500).render('pages/error', {
      message: 'Errore caricamento evento',
      error: error.message,
      title: 'Errore'
    });
  }
}