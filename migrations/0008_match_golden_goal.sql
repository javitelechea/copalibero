-- Gol de oro: equipo ganador cuando el marcador quedó empatado
ALTER TABLE matches ADD COLUMN golden_goal_winner TEXT CHECK (golden_goal_winner IN ('A', 'B') OR golden_goal_winner IS NULL);
