import { defaultNicknameForDisplayName } from "@/lib/first-match-roster";

export type PlayerLabelSource = {
  display_name: string;
  nickname?: string | null;
};

/** Apodo resuelto: DB → plantilla conocida → null. */
export function resolvedNickname(p: PlayerLabelSource): string | null {
  const fromDb = p.nickname?.trim();
  if (fromDb) return fromDb;
  return defaultNicknameForDisplayName(p.display_name);
}

/** Nombre visible en la app: apodo si existe, sino nombre completo. */
export function playerLabel(p: PlayerLabelSource): string {
  return resolvedNickname(p) ?? p.display_name.trim();
}

export function playerSortKey(p: PlayerLabelSource): string {
  return playerLabel(p).toLocaleLowerCase();
}

export function comparePlayers(a: PlayerLabelSource, b: PlayerLabelSource): number {
  return playerSortKey(a).localeCompare(playerSortKey(b));
}
