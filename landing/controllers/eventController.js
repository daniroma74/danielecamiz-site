// landing/controllers/eventController.js
import { getOne, queryDB } from '../config/database.js';

export async function getEventBySlug(db, slug) {
  const event = await getOne(db, `
    SELECT c.*, 
           ls.*,
           (SELECT COALESCE(SUM(seats), 0) FROM bookings 
            WHERE event_id = c.id AND status = 'confirmed') as booking_count
    FROM concerts c
    LEFT JOIN landing_settings ls ON ls.concert_id = c.id
    WHERE c.slug = ?
  `, [slug]);
  
  if (!event) return null;
  
  // ✅ CARICA PROGRAMMA CON SOLISTI
  const program = await queryDB(db, `
    SELECT 
      cp.*,
      w.title as work_title,
      w.subtitle as work_subtitle,
      w.catalogue,
      w.work_key,
      c.full_name as composer,
      m.movement_number,
      m.title as movement_title,
      m.tempo,
      per.name as soloist_name,
      per.instrument as soloist_instrument
    FROM concert_program cp
    JOIN works w ON cp.work_id = w.id
    LEFT JOIN composers c ON w.composer_id = c.id
    LEFT JOIN movements m ON cp.movement_id = m.id
    LEFT JOIN concert_performers per ON cp.soloist_id = per.id
    WHERE cp.concert_id = ?
    ORDER BY cp.position
  `, [event.id]);
  
  // Formatta programma con solisti
  event.program = program.map(item => {
    const work = {
      composer: item.composer,
      title: item.work_title,
      subtitle: item.work_subtitle,
      catalogue: item.catalogue,
      work_key: item.work_key,
      soloist: null
    };
    
    // Se c'è movimento, aggiungi info
    if (item.movement_id) {
      let movementParts = [];
      if (item.movement_number) movementParts.push(`${item.movement_number}.`);
      if (item.movement_title) movementParts.push(item.movement_title);
      if (item.tempo) movementParts.push(`(${item.tempo})`);
      
      if (movementParts.length > 0) {
        work.subtitle = movementParts.join(' ');
      }
    }
    
    // ✅ Aggiungi solista se presente
    if (item.soloist_name) {
      work.soloist = {
        name: item.soloist_name,
        instrument: item.soloist_instrument
      };
    }
    
    return work;
  });
  
  // Carica performers
  const performers = await queryDB(db,
    'SELECT id, role, name, instrument FROM concert_performers WHERE concert_id = ? ORDER BY role, name',
    [event.id]
  );
  
  event.performers = {
    conductor: performers.find(p => p.role === 'conductor')?.name || null,
    orchestra: performers.find(p => p.role === 'orchestra')?.name || null,
    soloists: performers.filter(p => p.role === 'soloist')
  };
  
  // Parse performers order
  event.performersOrder = event.show_performers_order 
    ? event.show_performers_order.split(',')
    : ['conductor', 'orchestra', 'soloists'];
  
  // Parse gallery images
  if (event.gallery_images) {
    try {
      event.gallery_images = typeof event.gallery_images === 'string' 
        ? JSON.parse(event.gallery_images) 
        : event.gallery_images;
      if (!Array.isArray(event.gallery_images)) event.gallery_images = [];
    } catch(e) {
      event.gallery_images = [];
    }
  } else {
    event.gallery_images = [];
  }
  
  // Hero image con poster orizzontale
  if (event.poster_horizontal_cloudinary && !event.hero_image_override) {
    event.hero_image_override = `https://res.cloudinary.com/dnwhnz2xy/image/upload/c_fill,w_1920,h_1080,g_center/${event.poster_horizontal_cloudinary}`;
  }
  
  return event;
}

export async function renderLanding(req, res, next) {
  try {
    const db = req.app.locals.db;
    let slug = req.headers.host?.split('.')[0] || req.query.event || 'default';
    
    // Gestisci sottodomini speciali
    if (['www', 'staging', 'danielecamiz-site', 'events-admin', 'localhost'].includes(slug)) {
      slug = req.query.event || 'default';
    }
    
    const event = await getEventBySlug(db, slug);
    
    if (!event) {
      return res.status(404).render('pages/error', {
        status: 404,
        message: 'Evento non trovato'
      });
    }
    
    res.render('pages/landing', { event });
  } catch (error) {
    console.error('Landing error:', error);
    res.status(500).render('pages/error', {
      status: 500,
      message: 'Errore del server'
    });
  }
}