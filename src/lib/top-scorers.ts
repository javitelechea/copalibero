import { comparePlayers } from "@/lib/player-label";
import { isGuestPlayer } from "@/lib/player-guest";
import type { MatchGoalRow, MatchRow, PlayerRow } from "@/lib/types";

export type TopScorerRow = {
  player: PlayerRow;
  /** Goles totales en partidos finalizados. */
  goals: number;
  /** Partidos finalizados en los que anotó al menos un gol. */
  scoringMatches: number;
};

/** Tabla de goleadores acumulada de todos los partidos jugados. */
export function computeTopScorers(
  players: PlayerRow[],
  matches: MatchRow[],
  goals: MatchGoalRow[]
): TopScorerRow[] {
  const playedIds = new Set(matches.filter((m) => m.status === "played").map((m) => m.id));
  const byPlayer = new Map<string, { goals: number; matchIds: Set<string> }>();

  for (const g of goals) {
    if (!playedIds.has(g.match_id) || g.goals <= 0) continue;
    const cur = byPlayer.get(g.player_id) ?? { goals: 0, matchIds: new Set<string>() };
    cur.goals += g.goals;
    cur.matchIds.add(g.match_id);
    byPlayer.set(g.player_id, cur);
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const list: TopScorerRow[] = [];

  for (const [playerId, { goals: total, matchIds }] of byPlayer) {
    const player = playerMap.get(playerId);
    if (!player || isGuestPlayer(player)) continue;
    list.push({ player, goals: total, scoringMatches: matchIds.size });
  }

  list.sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return comparePlayers(a.player, b.player);
  });

  return list;
}
