import type { MatchStatus } from "@/lib/types";

export type MatchRosterCounts = {
  convocadoCount: number;
  assignedCount: number;
};

export function normalizeMatchStatus(raw: unknown): MatchStatus {
  if (raw === "scheduled") return "scheduled";
  if (raw === "loaded") return "loaded";
  if (raw === "teams") return "teams";
  return "played";
}

export function matchStatusLabel(status: MatchStatus): string {
  switch (status) {
    case "scheduled":
      return "Programado";
    case "loaded":
      return "Cargado";
    case "teams":
      return "Equipos";
    case "played":
      return "Finalizado";
  }
}

export function isMatchFinalized(status: MatchStatus): boolean {
  return status === "played";
}

export function isMatchUpcoming(status: MatchStatus): boolean {
  return status === "scheduled" || status === "loaded" || status === "teams";
}

export function showsMatchScore(status: MatchStatus): boolean {
  return status === "played";
}

export function showsMatchTeams(status: MatchStatus): boolean {
  return status === "teams" || status === "played";
}

/** Ajusta el estado según convocatoria y asignación Blanco/Negro. */
export function resolveMatchStatus(
  status: MatchStatus,
  { convocadoCount, assignedCount }: MatchRosterCounts
): MatchStatus {
  if (status === "played") return "played";
  if (convocadoCount === 0) return "scheduled";
  if (assignedCount === convocadoCount && convocadoCount > 0) return "teams";
  if (convocadoCount > 0) return "loaded";
  return status;
}

export function rosterCountsFromLineups(
  lineups: { match_id: string; player_id: string; team: string }[],
  matchId: string
): MatchRosterCounts {
  const rows = lineups.filter((r) => r.match_id === matchId);
  const convocados = new Set(rows.map((r) => r.player_id));
  const assigned = new Set(
    rows.filter((r) => r.team === "A" || r.team === "B").map((r) => r.player_id)
  );
  return { convocadoCount: convocados.size, assignedCount: assigned.size };
}

export function rosterCountsFromDetails(match_players: { team: string; players: { id: string } | null }[]): MatchRosterCounts {
  const convocados = new Set<string>();
  const assigned = new Set<string>();
  for (const r of match_players) {
    if (!r.players?.id) continue;
    convocados.add(r.players.id);
    if (r.team === "A" || r.team === "B") assigned.add(r.players.id);
  }
  return { convocadoCount: convocados.size, assignedCount: assigned.size };
}
