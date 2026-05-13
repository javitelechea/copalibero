import type { MatchRow } from "@/lib/types";

/** Primer partido con estado `scheduled`, por fecha ascendente. */
export function pickNextScheduledMatch(matches: MatchRow[]): MatchRow | null {
  const upcoming = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.played_at.localeCompare(b.played_at));
  return upcoming[0] ?? null;
}

/** Partido jugado más reciente (`played_at` descendente). */
export function pickLastPlayedMatch(matches: MatchRow[]): MatchRow | null {
  const played = matches
    .filter((m) => m.status === "played")
    .sort((a, b) => b.played_at.localeCompare(a.played_at));
  return played[0] ?? null;
}

/** Ej. "Jueves 14/5" (mes sin cero a la izquierda). */
export function formatMatchDayShort(playedAt: string): string {
  const d = new Date(`${playedAt}T12:00:00`);
  const wd = d.toLocaleDateString("es", { weekday: "long" });
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const cap = wd.charAt(0).toUpperCase() + wd.slice(1);
  return `${cap} ${day}/${month}`;
}
