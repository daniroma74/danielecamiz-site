

BEGIN TRANSACTION;

PRAGMA foreign_keys = ON;

-- Extra metadata for rehearsals (prove)
ALTER TABLE rehearsals ADD COLUMN label TEXT;
ALTER TABLE rehearsals ADD COLUMN number INTEGER; -- ordine/numero prova
ALTER TABLE rehearsals ADD COLUMN planned_hours REAL CHECK (planned_hours IS NULL OR planned_hours >= 0);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_rehearsals_event_number ON rehearsals(event_id, number);
CREATE INDEX IF NOT EXISTS idx_rehearsals_event_planned ON rehearsals(event_id, planned_hours);

-- Certificate hours view: somma ore prove (frequenza effettiva) + ore concerto
DROP VIEW IF EXISTS v_certificate_hours;
CREATE VIEW v_certificate_hours AS
WITH reh AS (
  SELECT r.event_id,
         ra.participant_id,
         SUM(CASE WHEN ra.attended = 1 THEN COALESCE(ra.hours, 0) ELSE 0 END) AS rehearsal_hours
  FROM rehearsal_attendance ra
  JOIN rehearsals r ON r.id = ra.rehearsal_id
  GROUP BY r.event_id, ra.participant_id
),
evt AS (
  SELECT ea.event_id,
         ea.participant_id,
         SUM(CASE WHEN ea.attended = 1 THEN COALESCE(ea.hours, 0) ELSE 0 END) AS concert_hours
  FROM event_attendance ea
  GROUP BY ea.event_id, ea.participant_id
)
SELECT reh.event_id                         AS event_id,
       reh.participant_id                    AS participant_id,
       COALESCE(reh.rehearsal_hours, 0)      AS rehearsal_hours,
       COALESCE(evt.concert_hours, 0)        AS concert_hours,
       COALESCE(reh.rehearsal_hours, 0) + COALESCE(evt.concert_hours, 0) AS total_hours
FROM reh
LEFT JOIN evt ON evt.event_id = reh.event_id AND evt.participant_id = reh.participant_id
UNION
SELECT evt.event_id,
       evt.participant_id,
       0 AS rehearsal_hours,
       evt.concert_hours,
       evt.concert_hours AS total_hours
FROM evt
LEFT JOIN reh ON reh.event_id = evt.event_id AND reh.participant_id = evt.participant_id
WHERE reh.event_id IS NULL;

-- Optional rehearsal stats per event (conteggio e somma ore pianificate)
DROP VIEW IF EXISTS v_rehearsals_event_stats;
CREATE VIEW v_rehearsals_event_stats AS
SELECT event_id,
       COUNT(*) AS rehearsal_count,
       SUM(
         COALESCE(planned_hours,
           MAX(0, (julianday(COALESCE(ends_at, starts_at)) - julianday(starts_at)) * 24.0)
         )
       ) AS planned_hours_sum
FROM rehearsals
GROUP BY event_id;

COMMIT;