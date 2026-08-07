import { comparePlayers } from "@/lib/player-label";
import { isGuestPlayer } from "@/lib/player-guest";
import type { MatchGoalRow, MatchPlayerRow, MatchRow, PlayerRow } from "@/lib/types";

export type TopScorerRow = {
  player: PlayerRow;
  /** Goles totales en partidos finalizados. */
  goals: number;
  /** Partidos finalizados en los que estuvo en nómina (A/B), igual que PJ en la tabla general. */
  played: number;
};

/** Tabla de goleadores acumulada de todos los partidos jugados. */
export function computeTopScorers(
  players: PlayerRow[],
  matches: MatchRow[],
  lineups: MatchPlayerRow[],
  goals: MatchGoalRow[]
): TopScorerRow[] {
  const playedIds = new Set(matches.filter((m) => m.status === "played").map((m) => m.id));
  const goalsByPlayer = new Map<string, number>();
  const playedByPlayer = new Map<string, number>();

  for (const g of goals) {
    if (!playedIds.has(g.match_id) || g.goals <= 0) continue;
    goalsByPlayer.set(g.player_id, (goalsByPlayer.get(g.player_id) ?? 0) + g.goals);
  }

  for (const row of lineups) {
    if (!playedIds.has(row.match_id)) continue;
    if (row.team !== "A" && row.team !== "B") continue;
    playedByPlayer.set(row.player_id, (playedByPlayer.get(row.player_id) ?? 0) + 1);
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const list: TopScorerRow[] = [];

  for (const [playerId, totalGoals] of goalsByPlayer) {
    const player = playerMap.get(playerId);
    if (!player || isGuestPlayer(player)) continue;
    list.push({
      player,
      goals: totalGoals,
      played: playedByPlayer.get(playerId) ?? 0,
    });
  }

  list.sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return comparePlayers(a.player, b.player);
  });

  return list;
}
