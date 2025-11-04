// landing/controllers/adminController.js
import { getOne, queryDB, runDB } from '../config/database.js';

export async function renderDashboard(req, res) {
  try {
    const db = req.app.locals.db;
    
    const events = await queryDB(db, `
      SELECT c.*,
             (SELECT COUNT(*) FROM bookings WHERE event_id = c.id AND status = 'confirmed') as booking_count,
             (SELECT SUM(seats) FROM bookings WHERE event_id = c.id AND status = 'confirmed') as total_seats
      FROM concerts c
      WHERE c.is_future = 1
        AND date(c.date) >= date('now')
      ORDER BY c.date ASC
    `);
    
    res.render('pages/admin/dashboard', { 
      events,
      title: 'Dashboard Eventi'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Errore caricamento dashboard');
  }
}

export async function renderEditor(req, res) {
  const slug = req.params.slug;
  
  try {
    const db = req.app.locals.db;
    
    const concert = await getOne(db,
      'SELECT * FROM concerts WHERE slug = ?',
      [slug]
    );
    
    if (!concert) {
      return res.status(404).send('Evento non trovato');
    }
    
    const landingSettings = await getOne(db,
      'SELECT * FROM landing_settings WHERE concert_id = ?',
      [concert.id]
    );
    
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
    
    const performersOrdered = {
      conductor: performers.find(p => p.role === 'conductor')?.name || null,
      orchestra: performers.find(p => p.role === 'orchestra')?.name || null,
      soloists: performers.filter(p => p.role === 'soloist')
    };
    
    // MERGE completo concert + settings
    const eventData = {
      ...concert,
      ...(landingSettings || {}),
      performers: performersOrdered,
      program,
      bookingStats: {
        count: bookingStats?.count || 0,
        seats: bookingStats?.seats || 0
      }
    };
    
    res.render('pages/admin/editor', {
      event: eventData,
      title: `Editor - ${concert.title}`
    });
    
  } catch (error) {
    console.error('Editor error:', error);
    res.status(500).send('Errore caricamento editor');
  }
}

export async function renderEditorFromConcert(req, res) {
  try {
    const db = req.app.locals.db;
    const concertId = req.query.concert_id;
    
    if (!concertId) {
      return res.status(400).send('concert_id mancante');
    }
    
    const concert = await getOne(db, 'SELECT slug FROM concerts WHERE id = ?', [concertId]);
    
    if (!concert || !concert.slug) {
      return res.status(404).send('Concerto non trovato o manca slug');
    }
    
    res.redirect(`/edit/${concert.slug}`);
    
  } catch (error) {
    console.error('Error renderEditorFromConcert:', error);
    res.status(500).send('Errore caricamento concerto');
  }
}

export async function saveEvent(req, res) {
  const slug = req.params.slug;
  const data = req.body;
  
  console.log('=== SAVE EVENT ===');
  console.log('Slug:', slug);
  
  try {
    const db = req.app.locals.db;
    
    const concert = await getOne(db, 
      'SELECT id FROM concerts WHERE slug = ?', 
      [slug]
    );
    
    if (!concert) {
      return res.status(404).json({ 
        success: false, 
        message: 'Evento non trovato' 
      });
    }
    
    const existingSettings = await getOne(db,
      'SELECT * FROM landing_settings WHERE concert_id = ?',
      [concert.id]
    );
    
    // Converti checkboxes
    const show_counter = data.show_counter === true || data.show_counter === 1 || data.show_counter === '1' ? 1 : 0;
    const show_share_buttons = data.show_share_buttons === true || data.show_share_buttons === 1 || data.show_share_buttons === '1' ? 1 : 0;
    const booking_enabled = data.booking_enabled === true || data.booking_enabled === 1 || data.booking_enabled === '1' ? 1 : 0;
    const show_hero_title = data.show_hero_title !== undefined ? (data.show_hero_title === true || data.show_hero_title === 1 || data.show_hero_title === '1' ? 1 : 0) : 1;
    
    if (existingSettings) {
      await queryDB(db, `
        UPDATE landing_settings SET
          hero_image_override = ?,
          gallery_images = ?,
          performers_photos = ?, 
          booking_disclaimer = ?,
          meta_description = ?,
          social_image_override = ?,
          show_counter = ?,
          show_share_buttons = ?,
          show_hero_title = ?,
          custom_css = ?,
          venue_capacity = ?,
          event_title_override = ?,
          venue_map_embed = ?,
          venue_address = ?,
          footer_text = ?,
          show_performers_order = ?,
          booking_enabled = ?,
          performers_display_mode = ?,
          event_description = ?,
          faqs = ?,
          event_tags = ?
        WHERE concert_id = ?
      `, [
        data.hero_image_override || null,
        data.gallery_images || '[]',
        data.performers_photos || null,  
        data.booking_disclaimer || null,
        data.meta_description || null,
        data.social_image_override || null,
        show_counter,
        show_share_buttons,
        show_hero_title,
        data.custom_css || null,
        data.venue_capacity ? parseInt(data.venue_capacity) : null,
        data.event_title_override || null,
        data.venue_map_embed || null,
        data.venue_address || null,
        data.footer_text || null,
        data.show_performers_order || 'conductor,orchestra,soloists',
        booking_enabled,
        data.performers_display_mode || 'icons',
        data.event_description || null,
        data.faqs || null,
        data.event_tags || null,
        concert.id
      ]);
      
    } else {
      await queryDB(db, `
        INSERT INTO landing_settings (
          concert_id,
          hero_image_override,
          gallery_images,
          performers_photos,  
          booking_disclaimer,
          meta_description,
          social_image_override,
          show_counter,
          show_share_buttons,
          show_hero_title,
          custom_css,
          venue_capacity,
          event_title_override,
          venue_map_embed,
          venue_address,
          footer_text,
          show_performers_order,
          booking_enabled,
          performers_display_mode,
          event_description,
          faqs,
          event_tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        concert.id,
        data.hero_image_override || null,
        data.gallery_images || '[]',
        data.performers_photos || null,
        data.booking_disclaimer || null,
        data.meta_description || null,
        data.social_image_override || null,
        show_counter,
        show_share_buttons,
        show_hero_title,
        data.custom_css || null,
        data.venue_capacity ? parseInt(data.venue_capacity) : null,
        data.event_title_override || null,
        data.venue_map_embed || null,
        data.venue_address || null,
        data.footer_text || null,
        data.show_performers_order || 'conductor,orchestra,soloists',
        booking_enabled,
        data.performers_display_mode || 'icons',
        data.event_description || null,
        data.faqs || null,
        data.event_tags || null
      ]);
    }
    
    res.json({ 
      success: true, 
      message: 'Impostazioni salvate con successo'
    });
    
  } catch (error) {
    console.error('Save event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante il salvataggio',
      error: error.message 
    });
  }
}

export async function renderBookings(req, res) {
  try {
    const db = req.app.locals.db;
    const slug = req.params.slug;
    
    const concert = await getOne(db, 'SELECT * FROM concerts WHERE slug = ?', [slug]);
    
    if (!concert) {
      return res.status(404).send('Evento non trovato');
    }
    
    const bookings = await queryDB(db,
      `SELECT * FROM bookings 
       WHERE event_id = ? 
       ORDER BY created_at DESC`,
      [concert.id]
    );
    
    const totalSeats = bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.seats, 0);
    
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    
    res.render('pages/admin/bookings', {
      event: concert,
      bookings,
      totalSeats,
      confirmedBookings,
      title: `Prenotazioni: ${concert.title}`
    });
    
  } catch (error) {
    console.error('Bookings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function exportBookings(req, res) {
  try {
    const db = req.app.locals.db;
    const slug = req.params.slug;
    
    const concert = await getOne(db, 'SELECT id FROM concerts WHERE slug = ?', [slug]);
    
    if (!concert) {
      return res.status(404).send('Evento non trovato');
    }
    
    const bookings = await queryDB(db,
      `SELECT first_name, last_name, email, phone, seats, status, code, created_at 
       FROM bookings 
       WHERE event_id = ? 
       ORDER BY created_at DESC`,
      [concert.id]
    );
    
    const csv = [
      'Nome,Cognome,Email,Telefono,Posti,Stato,Codice,Data',
      ...bookings.map(b => 
        `"${b.first_name}","${b.last_name || ''}","${b.email}","${b.phone || ''}",${b.seats},"${b.status}","${b.code}","${b.created_at}"`
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="prenotazioni-${slug}.csv"`);
    res.send('\uFEFF' + csv);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).send('Errore export');
  }
}

export async function createEvent(req, res) {
  res.status(400).json({ 
    success: false, 
    message: 'Crea il concerto in Concerts Admin' 
  });
}

export async function deleteEvent(req, res) {
  try {
    const db = req.app.locals.db;
    const slug = req.params.slug;
    
    const concert = await getOne(db, 'SELECT id FROM concerts WHERE slug = ?', [slug]);
    
    if (!concert) {
      return res.status(404).json({ success: false, message: 'Evento non trovato' });
    }
    
    await runDB(db, 'DELETE FROM landing_settings WHERE concert_id = ?', [concert.id]);
    
    res.json({ success: true, message: 'Landing eliminata' });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function recalculateStats(req, res) {
  res.json({ success: true });
}