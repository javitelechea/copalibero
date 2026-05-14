-- Quién compró carne en cada fecha de asado (varios pueden marcar sí)
ALTER TABLE asado_attendees ADD COLUMN bought_meat INTEGER NOT NULL DEFAULT 0;
