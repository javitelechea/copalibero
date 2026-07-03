import type { PlayerRow } from "@/lib/types";

export function isGuestPlayer(p: Pick<PlayerRow, "guest">): boolean {
  return p.guest === true;
}

/** Jugadores que compiten por puntos en la tabla general. */
export function isTablePlayer(p: Pick<PlayerRow, "guest" | "active">): boolean {
  return p.active && !p.guest;
}
