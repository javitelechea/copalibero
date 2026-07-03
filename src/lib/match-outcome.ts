import type { MatchRow, Team } from "@/lib/types";

export type TeamMatchResult = "win" | "draw" | "loss";

export function parseGoldenGoalWinner(value: unknown): Team | null {
  if (value === "A" || value === "B") return value;
  return null;
}

export function isGoldenGoalMatch(match: Pick<MatchRow, "golden_goal_winner">): boolean {
  return match.golden_goal_winner === "A" || match.golden_goal_winner === "B";
}

/** Equipo ganador; null si empate (incl. marcador igual sin G.O.). */
export function winningTeamFromMatch(
  match: Pick<MatchRow, "team_a_score" | "team_b_score" | "golden_goal_winner" | "status">
): Team | null {
  if (match.status !== "played") return null;
  if (isGoldenGoalMatch(match)) return match.golden_goal_winner;
  if (match.team_a_score === match.team_b_score) return null;
  return match.team_a_score > match.team_b_score ? "A" : "B";
}

export function teamMatchResult(
  match: Pick<MatchRow, "team_a_score" | "team_b_score" | "golden_goal_winner" | "status">,
  team: Team
): TeamMatchResult {
  if (match.status !== "played") return "draw";
  const winner = winningTeamFromMatch(match);
  if (winner == null) return "draw";
  return team === winner ? "win" : "loss";
}

export function teamResultLabel(match: MatchRow, team: Team): string {
  const r = teamMatchResult(match, team);
  if (isGoldenGoalMatch(match)) {
    if (r === "win") return "Victoria (G.O.)";
    return "Derrota (G.O.)";
  }
  if (r === "win") return "Victoria";
  if (r === "draw") return "Empate";
  return "Derrota";
}

export function matchOutcomeTeam(match: MatchRow): Team | "draw" {
  const w = winningTeamFromMatch(match);
  return w ?? "draw";
}

export function matchScoreSummary(
  match: Pick<MatchRow, "team_a_score" | "team_b_score" | "golden_goal_winner">
): string {
  const base = `${match.team_a_score} — ${match.team_b_score}`;
  if (isGoldenGoalMatch(match)) return `${base} · G.O.`;
  return base;
}
