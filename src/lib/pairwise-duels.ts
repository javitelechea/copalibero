import { comparePlayers, playerLabel } from "@/lib/player-label";
import type { MatchPlayerRow, MatchRow, PlayerRow } from "@/lib/types";

export type DuelRecord = {
  playerA: PlayerRow;
  playerB: PlayerRow;
  aWins: number;
  bWins: number;
  draws: number;
  meetings: number;
};

type DuelAccum = {
  playerAId: string;
  playerBId: string;
  aWins: number;
  bWins: number;
  draws: number;
};

function pairKey(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

function matchOutcome(match: MatchRow): "A" | "B" | "draw" {
  if (match.team_a_score === match.team_b_score) return "draw";
  return match.team_a_score > match.team_b_score ? "A" : "B";
}

/**
 * Calcula duelos individuales: cada vez que dos jugadores estuvieron en equipos opuestos
 * en un partido jugado, cuenta victoria/empate para ese cruce.
 */
export function computePairwiseDuels(
  players: PlayerRow[],
  matches: MatchRow[],
  lineups: MatchPlayerRow[]
): DuelRecord[] {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const playedMatches = matches.filter((m) => m.status === "played");
  const byPair = new Map<string, DuelAccum>();

  for (const m of playedMatches) {
    const inMatch = lineups.filter((l) => l.match_id === m.id && l.team !== "pool");
    const teamA = inMatch.filter((l) => l.team === "A").map((l) => l.player_id);
    const teamB = inMatch.filter((l) => l.team === "B").map((l) => l.player_id);
    if (teamA.length === 0 || teamB.length === 0) continue;

    const outcome = matchOutcome(m);

    for (const idA of teamA) {
      for (const idB of teamB) {
        const [low, high] = pairKey(idA, idB);
        const key = `${low}|${high}`;
        const cur =
          byPair.get(key) ??
          ({
            playerAId: low,
            playerBId: high,
            aWins: 0,
            bWins: 0,
            draws: 0,
          } satisfies DuelAccum);

        if (outcome === "draw") {
          cur.draws += 1;
        } else if (outcome === "A") {
          if (idA === low) cur.aWins += 1;
          else cur.bWins += 1;
        } else {
          if (idB === low) cur.aWins += 1;
          else cur.bWins += 1;
        }

        byPair.set(key, cur);
      }
    }
  }

  const list: DuelRecord[] = [];
  for (const acc of byPair.values()) {
    const playerA = playerMap.get(acc.playerAId);
    const playerB = playerMap.get(acc.playerBId);
    if (!playerA || !playerB) continue;
    list.push({
      playerA,
      playerB,
      aWins: acc.aWins,
      bWins: acc.bWins,
      draws: acc.draws,
      meetings: acc.aWins + acc.bWins + acc.draws,
    });
  }

  list.sort((x, y) => {
    if (y.meetings !== x.meetings) return y.meetings - x.meetings;
    const marginX = Math.abs(x.aWins - x.bWins);
    const marginY = Math.abs(y.aWins - y.bWins);
    if (marginY !== marginX) return marginY - marginX;
    const nameA = `${playerLabel(x.playerA)} vs ${playerLabel(x.playerB)}`;
    const nameB = `${playerLabel(y.playerA)} vs ${playerLabel(y.playerB)}`;
    return nameA.localeCompare(nameB);
  });

  return list;
}

export function orderDuelByWinner(duel: DuelRecord): DuelRecord {
  if (duel.aWins > duel.bWins) return duel;
  if (duel.bWins > duel.aWins) {
    return {
      playerA: duel.playerB,
      playerB: duel.playerA,
      aWins: duel.bWins,
      bWins: duel.aWins,
      draws: duel.draws,
      meetings: duel.meetings,
    };
  }
  if (comparePlayers(duel.playerA, duel.playerB) <= 0) return duel;
  return {
    playerA: duel.playerB,
    playerB: duel.playerA,
    aWins: duel.bWins,
    bWins: duel.aWins,
    draws: duel.draws,
    meetings: duel.meetings,
  };
}

export function duelWinner(duel: DuelRecord): PlayerRow | null {
  if (duel.aWins > duel.bWins) return duel.playerA;
  if (duel.bWins > duel.aWins) return duel.playerB;
  return null;
}

export function duelMargin(duel: DuelRecord): number {
  return Math.abs(duel.aWins - duel.bWins);
}

export function duelLabel(duel: DuelRecord): string {
  const ordered = orderDuelByWinner(duel);
  const winner = duelWinner(ordered);
  if (!winner) return "Empate histórico";
  return `${playerLabel(ordered.playerA)} ${ordered.aWins}–${ordered.bWins} ${playerLabel(ordered.playerB)}`;
}

export type HijoDuel = {
  hijo: PlayerRow;
  margin: number;
  padreWins: number;
  hijoWins: number;
  draws: number;
  meetings: number;
};

export type PadreGroup = {
  padre: PlayerRow;
  hijos: HijoDuel[];
};

/** Agrupa duelos dominantes por ganador (padre) → lista de perdedores (hijos). */
export function groupDuelsByPadre(duels: DuelRecord[], minMargin = 3): PadreGroup[] {
  const byPadre = new Map<string, PadreGroup>();

  for (const raw of duels) {
    const duel = orderDuelByWinner(raw);
    const margin = duelMargin(duel);
    if (margin < minMargin) continue;

    const padreId = duel.playerA.id;
    const group =
      byPadre.get(padreId) ??
      ({
        padre: duel.playerA,
        hijos: [],
      } satisfies PadreGroup);

    group.hijos.push({
      hijo: duel.playerB,
      margin,
      padreWins: duel.aWins,
      hijoWins: duel.bWins,
      draws: duel.draws,
      meetings: duel.meetings,
    });

    byPadre.set(padreId, group);
  }

  const list = [...byPadre.values()];

  for (const group of list) {
    group.hijos.sort((a, b) => {
      if (b.margin !== a.margin) return b.margin - a.margin;
      return comparePlayers(a.hijo, b.hijo);
    });
  }

  list.sort((a, b) => {
    if (b.hijos.length !== a.hijos.length) return b.hijos.length - a.hijos.length;
    const maxA = a.hijos[0]?.margin ?? 0;
    const maxB = b.hijos[0]?.margin ?? 0;
    if (maxB !== maxA) return maxB - maxA;
    return comparePlayers(a.padre, b.padre);
  });

  return list;
}
