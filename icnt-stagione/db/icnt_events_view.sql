-- Crea una vista "comoda" con campi utili alla stagione
CREATE VIEW IF NOT EXISTS icnt_events_view AS
SELECT
  c.id,
  c.slug,
  NULL AS title,           -- calcolato in app
  NULL AS subtitle,
  strftime('%Y-%m-%d', c.starts_at, 'localtime') AS date,
  strftime('%H:%M', c.starts_at, 'localtime')    AS time,
  strftime('%H:%M', c.ends_at,   'localtime')    AS endTime,
  CASE
    WHEN instr(lower(c.slug), 'mozart')>0 AND instr(lower(c.slug), 'challenge')>0 THEN 'msc'
    WHEN instr(lower(c.slug), 'msc')>0 THEN 'msc'
    ELSE 'icnt'
  END AS type,
  NULL AS mscNumber,       -- più semplice calcolarlo in app
  NULL AS detailUrl,       -- risolto in app da tabella landing o da slug
  CASE
    WHEN CAST(strftime('%m', c.starts_at, 'localtime') AS INTEGER) >= 9
      THEN printf('%s-%s',
                  strftime('%Y', c.starts_at, 'localtime'),
                  substr(printf('%04d', CAST(strftime('%Y', c.starts_at, 'localtime') AS INTEGER)+1), 3, 2))
    ELSE printf('%s-%s',
                printf('%04d', CAST(strftime('%Y', c.starts_at, 'localtime') AS INTEGER)-1),
                substr(strftime('%Y', c.starts_at, 'localtime'), 3, 2))
  END AS season,
  CASE WHEN c.status='published' THEN 1 ELSE 0 END AS published
FROM concerts c;
