import type { PlayerRow } from "@/lib/types";

export type PlayerLabelSource = {
  display_name: string;
  nickname?: string | null;
};

/** Nombre visible en la app: apodo si existe, sino nombre completo. */
export function playerLabel(p: PlayerLabelSource): string {
  const nick = p.nickname?.trim();
  if (nick) return nick;
  return p.display_name.trim();
}

export function playerSortKey(p: PlayerLabelSource): string {
  return playerLabel(p).toLocaleLowerCase();
}

export function comparePlayers(a: PlayerLabelSource, b: PlayerLabelSource): number {
  return playerSortKey(a).localeCompare(playerSortKey(b));
}
