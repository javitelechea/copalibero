-- Aporte panificado / postre (1 pt c/u en la app, igual que carne)
ALTER TABLE asado_attendees ADD COLUMN panificado INTEGER NOT NULL DEFAULT 0;
ALTER TABLE asado_attendees ADD COLUMN postre INTEGER NOT NULL DEFAULT 0;
