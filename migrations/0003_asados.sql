CREATE TABLE asados (
  id TEXT PRIMARY KEY,
  held_at TEXT NOT NULL,
  notes TEXT,
  total_cost REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE asado_attendees (
  id TEXT PRIMARY KEY,
  asado_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  portions INTEGER NOT NULL DEFAULT 0,
  stayed INTEGER NOT NULL DEFAULT 0,
  UNIQUE(asado_id, player_id)
);

CREATE INDEX idx_asado_attendees_asado ON asado_attendees (asado_id);
