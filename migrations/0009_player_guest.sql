-- Jugadores invitados: participan en partidos pero no en la tabla general
ALTER TABLE players ADD COLUMN guest INTEGER NOT NULL DEFAULT 0;
