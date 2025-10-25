// cms/models/concertsRepo.js
// Repo eventi sul DB unico: usa SELECT * e parametri posizionali.

function mapEvent(row) {
  if (!row) return null;

  const starts = row.starts_at ? String(row.starts_at) : null;
  const ends   = row.ends_at   ? String(row.ends_at)   : null;

  const dateFromStarts   = starts ? starts.slice(0, 10) : null;
  const tStartFromStarts = starts ? starts.slice(11, 16) : null;
  const tEndFromEnds     = ends   ? ends.slice(11, 16)   : null;

  const date       = (row.date ?? dateFromStarts) || null;
  const time_start = (row.time_start ?? tStartFromStarts) || null;
  const time_end   = (row.time_end   ?? tEndFromEnds) || null;

  const parts = [];
  if (row.venue) parts.push(row.venue);
  if (row.city)  parts.push(row.city);
  const location = row.location ?? (parts.length ? parts.join(' - ') : null);

  return {
    id: row.id ?? null,
    slug: row.slug ?? null,

    starts_at: row.starts_at ?? (date && time_start ? `${date}T${time_start}:00` : null),
    ends_at:   row.ends_at   ?? (date && time_end   ? `${date}T${time_end}:00`   : null),

    venue: row.venue ?? null,
    city: row.city ?? null,
    country: row.country ?? null,
    location: location ?? null,

    title: row.title ?? null,
    description_md: row.description_md ?? null,

    date,
    time_start,
    time_end,
    status: row.status ?? null,
    poster_cloudinary_id: row.poster_cloudinary_id ?? null,
    poster_local_filename: row.poster_local_filename ?? null
  };
}

export function getBySlug(db, slug) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM concerts WHERE slug = ? LIMIT 1',
      [String(slug || '').trim()],
      (err, row) => (err ? reject(err) : resolve(mapEvent(row)))
    );
  });
}

export function getProgram(db, concertId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM event_program_items WHERE concert_id = ? ORDER BY sort_order ASC, id ASC',
      [Number(concertId)],
      (err, rows) => (err ? reject(err) : resolve(rows || []))
    );
  });
}

export function getLineup(db, concertId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM event_lineup WHERE concert_id = ? ORDER BY sort_order ASC, id ASC',
      [Number(concertId)],
      (err, rows) => (err ? reject(err) : resolve(rows || []))
    );
  });
}

export default { getBySlug, getProgram, getLineup };