-- Prioridad opcional para borrador de equipos (menor = mejor entre empates en tabla)
ALTER TABLE players ADD COLUMN draft_seed INTEGER;
