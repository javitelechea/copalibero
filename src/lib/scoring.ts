import type {
  ConfirmationStatus,
  MatchGoalRow,
  MatchPlayerRow,
  MatchRow,
  PlayerRow,
  Team,
} from "@/lib/types";

/** Puntos por reglas del torneo — ajustá acá */
export const SCORING = {
  presence: 1,
  win: 3,
  draw: 1,
  loss: 0,
  goal: 1,
  /** Confirmó y no fue al partido (no está en nómina) */
  noShowAfterConfirm: -2,
  /** Suma `bigWinBonus` si el partido se gana por más de esta diferencia de goles (p. ej. 3 → vale desde 4–0). */
  bigWinMarginGt: 3,
  bigWinBonus: 1,
} as const;

export type StandingRow = {
  player: PlayerRow;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  presence: number;
  noShowPenalties: number;
  /** Puntos extra por victorias con diferencia estrictamente mayor a `SCORING.bigWinMarginGt` goles. */
  bonus: number;
};

type StandingAccum = Omit<StandingRow, "player"> & { playerId: string };

function outcomeForTeam(
  match: MatchRow,
  team: Team
): "win" | "draw" | "loss" {
  if (match.status !== "played") return "draw";
  const a = match.team_a_score;
  const b = match.team_b_score;
  if (a === b) return "draw";
  if (team === "A") return a > b ? "win" : "loss";
  return b > a ? "win" : "loss";
}

function matchPointsForOutcome(outcome: "win" | "draw" | "loss"): number {
  if (outcome === "win") return SCORING.win;
  if (outcome === "draw") return SCORING.draw;
  return SCORING.loss;
}

/**
 * Calcula la tabla a partir de partidos jugados, nóminas, goles y confirmaciones.
 */
export function computeStandings(
  players: PlayerRow[],
  matches: MatchRow[],
  lineups: MatchPlayerRow[],
  goals: MatchGoalRow[],
  confirmations: { match_id: string; player_id: string; status: ConfirmationStatus }[]
): StandingRow[] {
  const playedMatches = matches.filter((m) => m.status === "played");
  const lineupSet = new Set(
    lineups.filter((l) => l.team !== "pool").map((l) => `${l.match_id}:${l.player_id}`)
  );
  const confirmMap = new Map<string, ConfirmationStatus>();
  for (const c of confirmations) {
    confirmMap.set(`${c.match_id}:${c.player_id}`, c.status);
  }

  const goalsByPlayerMatch = new Map<string, number>();
  for (const g of goals) {
    const k = `${g.match_id}:${g.player_id}`;
    goalsByPlayerMatch.set(k, (goalsByPlayerMatch.get(k) ?? 0) + g.goals);
  }

  const byPlayer = new Map<string, StandingAccum>();

  for (const p of players) {
    if (!p.active) continue;
    byPlayer.set(p.id, {
      playerId: p.id,
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals: 0,
      presence: 0,
      noShowPenalties: 0,
      bonus: 0,
    });
  }

  for (const m of playedMatches) {
    const inMatch = lineups.filter((l) => l.match_id === m.id && l.team !== "pool");

    for (const row of inMatch) {
      if (row.team !== "A" && row.team !== "B") continue;
      const team = row.team;
      const st = byPlayer.get(row.player_id);
      if (!st) continue;
      st.played += 1;
      st.presence += 1;
      st.points += SCORING.presence;
      const o = outcomeForTeam(m, team);
      if (o === "win") st.wins += 1;
      else if (o === "draw") st.draws += 1;
      else st.losses += 1;
      st.points += matchPointsForOutcome(o);
      if (o === "win") {
        const diff =
          team === "A"
            ? m.team_a_score - m.team_b_score
            : m.team_b_score - m.team_a_score;
        if (diff > SCORING.bigWinMarginGt) {
          st.points += SCORING.bigWinBonus;
          st.bonus += SCORING.bigWinBonus;
        }
      }
      const gk = `${m.id}:${row.player_id}`;
      const g = goalsByPlayerMatch.get(gk) ?? 0;
      st.goals += g;
      st.points += g * SCORING.goal;
    }

    for (const [key, status] of confirmMap.entries()) {
      if (!key.startsWith(`${m.id}:`)) continue;
      if (status !== "confirmed") continue;
      const playerId = key.slice(m.id.length + 1);
      if (lineupSet.has(`${m.id}:${playerId}`)) continue;
      const st = byPlayer.get(playerId);
      if (!st) continue;
      st.noShowPenalties += 1;
      st.points += SCORING.noShowAfterConfirm;
    }
  }

  const list: StandingRow[] = [];
  for (const p of players) {
    if (!p.active) continue;
    const s = byPlayer.get(p.id);
    if (!s) continue;
    list.push({
      player: p,
      points: s.points,
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      goals: s.goals,
      presence: s.presence,
      noShowPenalties: s.noShowPenalties,
      bonus: s.bonus,
    });
  }

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.player.display_name.localeCompare(b.player.display_name);
  });

  return list;
}
