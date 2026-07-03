import { resolvedNickname } from "@/lib/player-label";
import type { PlayerRow, Team } from "@/lib/types";

export type ParsedPastePlayer = {
  playerId: string;
  goals: number;
  label: string;
};

export type PendingGuestPlayer = {
  name: string;
  goals: number;
  team: Team;
};

export type ParseMatchPasteResult = {
  teamA: ParsedPastePlayer[];
  teamB: ParsedPastePlayer[];
  scoreA: number;
  scoreB: number;
  /** Invitados a crear (marcados con invitado en el texto). */
  pendingGuests: PendingGuestPlayer[];
  errors: string[];
};

const TEAM_LINE =
  /^\s*(Blanco|Negro)\s*(?:\(\s*(\d+)\s*\))?\s*:\s*(.+)\s*$/i;

/** Apodos alternativos frecuentes al pegar resultados. */
const NICKNAME_ALIASES: Record<string, string> = {
  moski: "mosca",
  peti: "pety",
};

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parsePlayerChunk(raw: string): { name: string; goals: number; isGuest: boolean } {
  let s = raw.trim();
  if (!s) return { name: "", goals: 0, isGuest: false };

  const isGuest = /\(\s*invitado\s*\*?\s*\)/i.test(s) || /\binvitado\s*\*?\b/i.test(s);
  s = s.replace(/\(\s*invitado\s*\*?\s*\)/gi, "").replace(/\binvitado\s*\*?\b/gi, "").trim();

  const endGoals = s.match(/^(.+?)\s+(\d+)\s*$/);
  if (endGoals) {
    return { name: endGoals[1].trim(), goals: Number(endGoals[2]), isGuest };
  }

  return { name: s, goals: 0, isGuest };
}

function resolvePlayer(name: string, players: PlayerRow[]): PlayerRow | null {
  const key = norm(name);
  if (!key) return null;

  const wanted = new Set([key, NICKNAME_ALIASES[key] ?? key]);

  for (const p of players) {
    const nick = p.nickname ? norm(p.nickname) : "";
    const resolved = norm(resolvedNickname(p) ?? "");
    const display = norm(p.display_name);

    if (wanted.has(nick) || wanted.has(resolved) || wanted.has(display)) return p;
  }

  return null;
}

function teamFromLabel(label: string): Team | null {
  const x = norm(label);
  if (x === "blanco") return "A";
  if (x === "negro") return "B";
  return null;
}

/**
 * Parsea texto pegado tipo:
 * Negro (9): Javi 2, Gasti 1(invitado*), Plasty 1, Andy 5, Marian, Topo
 * Blanco (10): Campa 2, Mosca 2, bocón (invitado*) 1, Tanque 5, Pety, Colo, Hongo
 */
export function parseMatchPaste(text: string, players: PlayerRow[]): ParseMatchPasteResult {
  const errors: string[] = [];
  const pendingGuests: PendingGuestPlayer[] = [];
  const teamA: ParsedPastePlayer[] = [];
  const teamB: ParsedPastePlayer[] = [];
  let scoreA = 0;
  let scoreB = 0;
  let foundA = false;
  let foundB = false;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const m = line.match(TEAM_LINE);
    if (!m) {
      errors.push(`Línea no reconocida: «${line}»`);
      continue;
    }

    const team = teamFromLabel(m[1]);
    if (!team) continue;

    const headerScore = m[2] != null ? Number(m[2]) : null;
    const chunks = m[3].split(",").map((x) => x.trim()).filter(Boolean);

    const bucket = team === "A" ? teamA : teamB;
    if (team === "A") foundA = true;
    else foundB = true;

    let sumGoals = 0;

    for (const chunk of chunks) {
      const { name, goals, isGuest } = parsePlayerChunk(chunk);
      if (!name) continue;

      const player = resolvePlayer(name, players);
      if (!player) {
        if (isGuest) {
          pendingGuests.push({ name, goals, team });
          sumGoals += goals;
          continue;
        }
        errors.push(`No encontré jugador con apodo «${name}»`);
        continue;
      }

      if (bucket.some((row) => row.playerId === player.id)) {
        errors.push(`«${name}» aparece más de una vez en ${team === "A" ? "Blanco" : "Negro"}`);
        continue;
      }

      bucket.push({
        playerId: player.id,
        goals,
        label: resolvedNickname(player) ?? name,
      });
      sumGoals += goals;
    }

    if (team === "A") {
      scoreA = headerScore ?? sumGoals;
    } else {
      scoreB = headerScore ?? sumGoals;
    }

    if (headerScore != null && headerScore !== sumGoals) {
      errors.push(
        `${team === "A" ? "Blanco" : "Negro"}: el total entre paréntesis (${headerScore}) no coincide con la suma de goles (${sumGoals})`
      );
    }
  }

  if (!foundA || !foundB) {
    errors.unshift("Pegá una línea por equipo, por ejemplo: «Blanco (10): …» y «Negro (9): …»");
  }

  return { teamA, teamB, scoreA, scoreB, pendingGuests, errors };
}

export const MATCH_PASTE_EXAMPLE = `Negro (9): Javi 2, Gasti 1(invitado*), Plasty 1, Andy 5, Marian, Agus Gasti (invitado*), Topo
Blanco (10): Campa 2, Mosca 2, bocón (invitado*) 1, Tanque 5, Pety, Colo, Hongo`;
