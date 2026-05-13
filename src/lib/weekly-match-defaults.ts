/** Texto fijo para notas del partido (horario + sede). Ajustá si cambia el lugar. */
export const LIBERO_MATCH_NOTES = "22 h · Libero Futbol Lomas";

/**
 * Próximo jueves en calendario local (YYYY-MM-DD).
 * Si hoy es jueves, devuelve el jueves de la semana siguiente (evita “hoy” ambiguo).
 */
export function nextThursdayLocalYmd(from: Date = new Date()): string {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const dow = d.getDay();
  let delta = (4 - dow + 7) % 7;
  if (delta === 0) delta = 7;
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
