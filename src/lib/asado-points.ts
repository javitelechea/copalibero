import type { AsadoAttendeeRow } from "@/lib/types";

/** Puntos de asado por fecha: 1 c/u si aplica (las porciones no suman puntos). */
export const ASADO_POINTS = {
  stayed: 1,
  boughtMeat: 1,
  panificado: 1,
  postre: 1,
} as const;

export function asadoPointsForRow(r: AsadoAttendeeRow): number {
  return (
    (r.stayed ? ASADO_POINTS.stayed : 0) +
    (r.bought_meat ? ASADO_POINTS.boughtMeat : 0) +
    (r.panificado ? ASADO_POINTS.panificado : 0) +
    (r.postre ? ASADO_POINTS.postre : 0)
  );
}

/** Suma de puntos de asado por jugador (todas las fechas). */
export function totalAsadoPointsByPlayer(attendees: AsadoAttendeeRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of attendees) {
    m.set(r.player_id, (m.get(r.player_id) ?? 0) + asadoPointsForRow(r));
  }
  return m;
}
