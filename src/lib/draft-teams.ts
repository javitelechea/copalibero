import type { MatchPlayerRow, PlayerRow } from "@/lib/types";
import type { StandingRow } from "@/lib/scoring";

const NO_SEED = 1_000_000;

function standingById(standings: StandingRow[]): Map<string, StandingRow> {
  const m = new Map<string, StandingRow>();
  for (const s of standings) m.set(s.player.id, s);
  return m;
}

/** Convocados en pool para un partido (sin equipo A/B todavía). */
export function poolPlayerIdsForMatch(lineups: MatchPlayerRow[], matchId: string): string[] {
  const ids = lineups
    .filter((l) => l.match_id === matchId && l.team === "pool")
    .map((l) => l.player_id);
  return [...new Set(ids)];
}

/**
 * Orden “mejor → peor” alineado a la tabla: puntos, goles, victorias;
 * si todo empata, `draft_seed` ascendente (menor = antes) y luego nombre.
 */
export function sortPlayersForTeamDraft(players: PlayerRow[], standings: StandingRow[]): PlayerRow[] {
  const st = standingById(standings);
  return [...players].sort((a, b) => {
    const sa = st.get(a.id);
    const sb = st.get(b.id);
    const pa = sa?.points ?? 0;
    const pb = sb?.points ?? 0;
    if (pb !== pa) return pb - pa;
    const ga = sa?.goals ?? 0;
    const gb = sb?.goals ?? 0;
    if (gb !== ga) return gb - ga;
    const wa = sa?.wins ?? 0;
    const wb = sb?.wins ?? 0;
    if (wb !== wa) return wb - wa;
    const seedA = a.draft_seed != null && Number.isFinite(a.draft_seed) ? a.draft_seed : NO_SEED;
    const seedB = b.draft_seed != null && Number.isFinite(b.draft_seed) ? b.draft_seed : NO_SEED;
    if (seedA !== seedB) return seedA - seedB;
    return a.display_name.localeCompare(b.display_name);
  });
}

export type DraftRosterSlot = "A" | "B" | "pool";

/** Mejor → peor en índices pares → A, impares → B. */
export function alternatingTeamsFromOrdered(
  ordered: PlayerRow[]
): Record<string, Exclude<DraftRosterSlot, "pool">> {
  const out: Record<string, "A" | "B"> = {};
  ordered.forEach((p, i) => {
    out[p.id] = i % 2 === 0 ? "A" : "B";
  });
  return out;
}
