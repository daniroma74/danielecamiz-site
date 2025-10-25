-- cms/db/schema/main.session.sql

-- Tabella movimenti dei brani
CREATE TABLE IF NOT EXISTS work_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    tempo TEXT,
    duration_minutes INTEGER,
    notes TEXT,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_movements_work ON work_movements(work_id);
CREATE INDEX IF NOT EXISTS idx_work_movements_position ON work_movements(work_id, position);