import { displayMatchScores, winningTeamFromMatch } from "@/lib/match-outcome";
import { teamDisplayName } from "@/lib/team-labels";
import type { MatchRow, Team } from "@/lib/types";

export type Curiosity = {
  id: string;
  text: string;
  stat?: string;
  matchId?: string;
};

export type CuriositySection = {
  id: string;
  title: string;
  items: Curiosity[];
};

function dateShort(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("es", {
    day: "numeric",
    month: "short",
  });
}

export function computeCuriosities(matches: MatchRow[]): CuriositySection[] {
  const played = matches
    .filter((m) => m.status === "played")
    .slice()
    .sort((a, b) => a.played_at.localeCompare(b.played_at));

  if (played.length === 0) return [];

  let blancoWins = 0;
  let negroWins = 0;
  let draws = 0;
  let golden = 0;
  let oneGoal = 0;
  let blowouts = 0;
  let totalGoals = 0;

  let bestBlowout: {
    match: MatchRow;
    winner: Team;
    diff: number;
    scoreA: number;
    scoreB: number;
  } | null = null;
  let bestTotal: { match: MatchRow; total: number; scoreA: number; scoreB: number } | null = null;
  let lowestTotal: { match: MatchRow; total: number; scoreA: number; scoreB: number } | null = null;

  let longest: { team: Team; n: number } | null = null;
  let runTeam: Team | null = null;
  let runLen = 0;

  for (const m of played) {
    const { scoreA, scoreB } = displayMatchScores(m);
    const winner = winningTeamFromMatch(m);
    if (m.golden_goal_winner) golden += 1;
    if (winner === "A") blancoWins += 1;
    else if (winner === "B") negroWins += 1;
    else draws += 1;

    const diff = Math.abs(scoreA - scoreB);
    if (diff === 1) oneGoal += 1;
    if (winner && diff >= 3) blowouts += 1;
    if (winner && diff > (bestBlowout?.diff ?? -1)) {
      bestBlowout = { match: m, winner, diff, scoreA, scoreB };
    }

    const total = scoreA + scoreB;
    totalGoals += total;
    if (total > (bestTotal?.total ?? -1)) {
      bestTotal = { match: m, total, scoreA, scoreB };
    }
    if (lowestTotal == null || total < lowestTotal.total) {
      lowestTotal = { match: m, total, scoreA, scoreB };
    }

    if (!winner) {
      runTeam = null;
      runLen = 0;
    } else if (winner === runTeam) {
      runLen += 1;
    } else {
      runTeam = winner;
      runLen = 1;
    }
    if (runTeam && runLen > (longest?.n ?? 0)) {
      longest = { team: runTeam, n: runLen };
    }
  }

  let tailStreak = 0;
  let tailTeam: Team | null = null;
  for (let i = played.length - 1; i >= 0; i--) {
    const w = winningTeamFromMatch(played[i]);
    if (!w) break;
    if (tailTeam == null) {
      tailTeam = w;
      tailStreak = 1;
      continue;
    }
    if (w === tailTeam) tailStreak += 1;
    else break;
  }

  const colorItems: Curiosity[] = [
    {
      id: "color-tally",
      text: `En ${played.length} jueves, ${teamDisplayName("A")} ganó ${blancoWins} ${blancoWins === 1 ? "vez" : "veces"} y ${teamDisplayName("B")} ganó ${negroWins} ${negroWins === 1 ? "vez" : "veces"}${draws > 0 ? ` · ${draws} empate${draws === 1 ? "" : "s"}` : ""}.`,
      stat: `${blancoWins}–${negroWins}`,
    },
  ];
  if (golden > 0) {
    colorItems.push({
      id: "color-gg",
      text: `${golden} partido${golden === 1 ? "" : "s"} se defini${golden === 1 ? "ó" : "eron"} por gol de oro.`,
      stat: String(golden),
    });
  }
  if (tailTeam && tailStreak >= 2) {
    colorItems.push({
      id: "color-streak",
      text: `${teamDisplayName(tailTeam)} viene de ganar ${tailStreak} jueves seguidos.`,
      stat: String(tailStreak),
    });
  }
  if (longest && longest.n >= 3 && !(tailTeam === longest.team && tailStreak === longest.n)) {
    colorItems.push({
      id: "color-longest",
      text: `La racha más larga fue de ${teamDisplayName(longest.team)}: ${longest.n} jueves seguidos.`,
      stat: String(longest.n),
    });
  }

  const recordItems: Curiosity[] = [];
  if (bestBlowout) {
    const wScore = bestBlowout.winner === "A" ? bestBlowout.scoreA : bestBlowout.scoreB;
    const lScore = bestBlowout.winner === "A" ? bestBlowout.scoreB : bestBlowout.scoreA;
    recordItems.push({
      id: "blowout",
      text: `La paliza más grande: ${teamDisplayName(bestBlowout.winner)} ganó ${wScore}–${lScore} el ${dateShort(bestBlowout.match.played_at)}.`,
      stat: `${bestBlowout.diff}`,
      matchId: bestBlowout.match.id,
    });
  }
  if (bestTotal) {
    recordItems.push({
      id: "highest",
      text: `El jueves más goleador: ${bestTotal.scoreA}–${bestTotal.scoreB} (${bestTotal.total} goles) el ${dateShort(bestTotal.match.played_at)}.`,
      stat: String(bestTotal.total),
      matchId: bestTotal.match.id,
    });
  }
  if (lowestTotal && lowestTotal.match.id !== bestTotal?.match.id) {
    recordItems.push({
      id: "lowest",
      text: `El jueves con menos goles: ${lowestTotal.scoreA}–${lowestTotal.scoreB} (${lowestTotal.total} goles) el ${dateShort(lowestTotal.match.played_at)}.`,
      stat: String(lowestTotal.total),
      matchId: lowestTotal.match.id,
    });
  }
  if (oneGoal > 0) {
    recordItems.push({
      id: "one-goal",
      text: `${oneGoal} partido${oneGoal === 1 ? "" : "s"} se definieron por un gol.`,
      stat: String(oneGoal),
    });
  }
  if (blowouts > 0) {
    recordItems.push({
      id: "blowouts",
      text: `${blowouts} goleada${blowouts === 1 ? "" : "s"} (ganó por 3 o más).`,
      stat: String(blowouts),
    });
  }
  if (played.length >= 3) {
    const avg = totalGoals / played.length;
    recordItems.push({
      id: "avg-goals",
      text: `Promedio de ${avg.toFixed(1).replace(".", ",")} goles por jueves.`,
      stat: avg.toFixed(1).replace(".", ","),
    });
  }

  return [
    { id: "colores", title: "Blanco y Negro", items: colorItems },
    { id: "partidos", title: "De los partidos", items: recordItems },
  ].filter((s) => s.items.length > 0);
}
