// Models for Concert operations

export class Concert {
  static findById(db, id) {
    return db.prepare(`
      SELECT c.*,
             cls.id as landing_id,
             cls.hero_title,
             cls.hero_subtitle,
             cls.hero_image_url,
             cls.description_html,
             cls.show_program,
             cls.show_location,
             cls.show_booking_form,
             cls.show_gallery,
             cls.gallery_images,
             cls.booking_enabled,
             cls.max_seats_per_booking,
             cls.booking_deadline,
             cls.newsletter_enabled,
             cls.newsletter_text,
             cls.primary_color,
             cls.secondary_color,
             (SELECT COUNT(*) FROM concert_bookings WHERE concert_id = c.id AND status = 'confirmed') as booking_count,
             (SELECT COALESCE(SUM(seats), 0) FROM concert_bookings WHERE concert_id = c.id AND status = 'confirmed') as seats_booked
      FROM concerts c
      LEFT JOIN concert_landing_settings cls ON cls.concert_id = c.id
      WHERE c.id = ?
    `).get(id);
  }

  static findBySlug(db, slug) {
    return db.prepare(`
      SELECT c.*,
             cls.id as landing_id,
             cls.hero_title,
             cls.hero_subtitle,
             cls.hero_image_url,
             cls.description_html,
             cls.show_program,
             cls.show_location,
             cls.show_booking_form,
             cls.show_gallery,
             cls.gallery_images,
             cls.booking_enabled,
             cls.max_seats_per_booking,
             cls.booking_deadline,
             cls.newsletter_enabled,
             cls.newsletter_text,
             cls.primary_color,
             cls.secondary_color,
             (SELECT COUNT(*) FROM concert_bookings WHERE concert_id = c.id AND status = 'confirmed') as booking_count,
             (SELECT COALESCE(SUM(seats), 0) FROM concert_bookings WHERE concert_id = c.id AND status = 'confirmed') as seats_booked
      FROM concerts c
      LEFT JOIN concert_landing_settings cls ON cls.concert_id = c.id
      WHERE c.slug = ?
    `).get(slug);
  }

  static findAllPublished(db) {
    return db.prepare(`
      SELECT c.*,
             cls.id as landing_id,
             cls.booking_enabled,
             (SELECT COUNT(*) FROM concert_bookings WHERE concert_id = c.id AND status = 'confirmed') as booking_count,
             (SELECT COALESCE(SUM(seats), 0) FROM concert_bookings WHERE concert_id = c.id AND status = 'confirmed') as seats_booked
      FROM concerts c
      LEFT JOIN concert_landing_settings cls ON cls.concert_id = c.id
      WHERE c.is_published = 1
      ORDER BY c.date DESC
    `).all();
  }

  static hasLandingPage(db, concertId) {
    const result = db.prepare(`
      SELECT id FROM concert_landing_settings WHERE concert_id = ?
    `).get(concertId);
    return !!result;
  }

  static createOrUpdateLanding(db, concertId, data) {
    const exists = this.hasLandingPage(db, concertId);

    if (exists) {
      // Update
      return db.prepare(`
        UPDATE concert_landing_settings
        SET hero_title = ?,
            hero_subtitle = ?,
            hero_image_url = ?,
            description_html = ?,
            show_program = ?,
            show_location = ?,
            show_booking_form = ?,
            show_gallery = ?,
            gallery_images = ?,
            booking_enabled = ?,
            max_seats_per_booking = ?,
            booking_deadline = ?,
            newsletter_enabled = ?,
            newsletter_text = ?,
            primary_color = ?,
            secondary_color = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE concert_id = ?
      `).run(
        data.hero_title,
        data.hero_subtitle,
        data.hero_image_url,
        data.description_html,
        data.show_program ? 1 : 0,
        data.show_location ? 1 : 0,
        data.show_booking_form ? 1 : 0,
        data.show_gallery ? 1 : 0,
        data.gallery_images,
        data.booking_enabled ? 1 : 0,
        data.max_seats_per_booking || 4,
        data.booking_deadline,
        data.newsletter_enabled ? 1 : 0,
        data.newsletter_text,
        data.primary_color || '#8B4513',
        data.secondary_color || '#4a7c59',
        concertId
      );
    } else {
      // Create
      return db.prepare(`
        INSERT INTO concert_landing_settings (
          concert_id, hero_title, hero_subtitle, hero_image_url, description_html,
          show_program, show_location, show_booking_form, show_gallery, gallery_images,
          booking_enabled, max_seats_per_booking, booking_deadline,
          newsletter_enabled, newsletter_text, primary_color, secondary_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        concertId,
        data.hero_title,
        data.hero_subtitle,
        data.hero_image_url,
        data.description_html,
        data.show_program ? 1 : 0,
        data.show_location ? 1 : 0,
        data.show_booking_form ? 1 : 0,
        data.show_gallery ? 1 : 0,
        data.gallery_images,
        data.booking_enabled ? 1 : 0,
        data.max_seats_per_booking || 4,
        data.booking_deadline,
        data.newsletter_enabled ? 1 : 0,
        data.newsletter_text,
        data.primary_color || '#8B4513',
        data.secondary_color || '#4a7c59'
      );
    }
  }
}
