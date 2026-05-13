-- CopaLibero: datos en D1 (sin fotos / sin Storage)
PRAGMA foreign_keys = ON;

CREATE TABLE admins (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  played_at TEXT NOT NULL,
  team_a_score INTEGER NOT NULL DEFAULT 0,
  team_b_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE match_players (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team TEXT NOT NULL
);

CREATE TABLE match_goals (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  goals INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE match_confirmations (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_match_players_match ON match_players (match_id);
CREATE INDEX idx_match_goals_match ON match_goals (match_id);
CREATE INDEX idx_match_conf_match ON match_confirmations (match_id);

-- Contraseña inicial: changeme (cambiá en producción con wrangler d1 execute o panel)
INSERT INTO admins (email, password_hash) VALUES (
  'admin@copalibero.local',
  '$2b$10$DrmD8BOwrdj4NEzduz0juOH/QO5ymA20XKml55CNMeJsayn4oZMDq'
);
