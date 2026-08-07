import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
} from "firebase/firestore/lite";
import {
  DEMO_CONFIRMATIONS,
  DEMO_GOALS,
  DEMO_LINEUPS,
  DEMO_MATCHES,
  DEMO_PLAYERS,
  demoMatchById,
} from "@/lib/demo-data";
import { comparePlayers } from "@/lib/player-label";
import { defaultNicknameForDisplayName } from "@/lib/first-match-roster";
import { isD1Backend, isOfflineDemoData } from "@/lib/env";
import { getFirestoreDb } from "@/lib/firebase/client";
import {
  normalizeMatchStatus,
  resolveMatchStatus,
  rosterCountsFromDetails,
  rosterCountsFromLineups,
} from "@/lib/match-status";
import { parseGoldenGoalWinner } from "@/lib/match-outcome";
import { cachedFetch, invalidateQueryCache } from "@/lib/query-cache";
import type {
  MatchConfirmationRow,
  MatchGoalRow,
  MatchPlayerRow,
  MatchRosterRole,
  MatchRow,
  MatchWithDetails,
  PlayerRow,
  Team,
} from "@/lib/types";

export { invalidateQueryCache };

const CACHE = {
  players: "players:all",
  matches: "matches:raw",
  lineups: "match_players",
  goals: "match_goals",
  confirmations: "match_confirmations",
  admin: (uid: string) => `admin:${uid}`,
} as const;

/** Limpia lecturas cacheadas tras editar torneo (admin). */
export function invalidateTournamentDataCache(): void {
  invalidateQueryCache(
    CACHE.players,
    CACHE.matches,
    CACHE.lineups,
    CACHE.goals,
    CACHE.confirmations
  );
}

const C = {
  players: "players",
  matches: "matches",
  matchPlayers: "match_players",
  matchGoals: "match_goals",
  matchConfirmations: "match_confirmations",
  admins: "admins",
} as const;

async function cfJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const r = await fetch(`/api/copalibero/${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : r.statusText);
  return j as T;
}

function isoFromField(v: unknown): string {
  if (v == null) return new Date().toISOString();
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return String(v);
}

function playerFromDoc(d: { id: string; data: () => Record<string, unknown> }): PlayerRow {
  const x = d.data();
  const rawSeed = x.draft_seed;
  let draft_seed: number | null | undefined;
  if (rawSeed == null) draft_seed = undefined;
  else if (typeof rawSeed === "number" && Number.isFinite(rawSeed)) draft_seed = rawSeed;
  else if (typeof rawSeed === "string" && rawSeed.trim() !== "") {
    const n = Number(rawSeed);
    draft_seed = Number.isFinite(n) ? n : undefined;
  } else draft_seed = undefined;
  return {
    id: d.id,
    display_name: String(x.display_name ?? ""),
    nickname:
      x.nickname != null && String(x.nickname).trim() !== ""
        ? String(x.nickname).trim()
        : defaultNicknameForDisplayName(String(x.display_name ?? "")),
    avatar_url: x.avatar_url != null ? String(x.avatar_url) : null,
    active: x.active !== false,
    guest: x.guest === true,
    created_at: isoFromField(x.created_at),
    ...(draft_seed !== undefined ? { draft_seed } : {}),
  };
}

function rosterTeamFromFirestore(x: unknown): MatchRosterRole {
  if (x === "B") return "B";
  if (x === "pool") return "pool";
  return "A";
}

function matchFromDoc(d: { id: string; data: () => Record<string, unknown> }): MatchRow {
  const x = d.data();
  return {
    id: d.id,
    played_at: String(x.played_at ?? "").slice(0, 10),
    team_a_score: Number(x.team_a_score ?? 0),
    team_b_score: Number(x.team_b_score ?? 0),
    golden_goal_winner: parseGoldenGoalWinner(x.golden_goal_winner),
    status: normalizeMatchStatus(x.status),
    notes: x.notes != null ? String(x.notes) : null,
    created_at: isoFromField(x.created_at),
  };
}

export async function fetchPlayers(activeOnly = true): Promise<PlayerRow[]> {
  if (isOfflineDemoData()) {
    let list = [...DEMO_PLAYERS];
    if (activeOnly) list = list.filter((p) => p.active);
    return list.sort(comparePlayers);
  }
  if (isD1Backend()) {
    const all = await cachedFetch(CACHE.players, async () => {
      const j = await cfJson<{ players: PlayerRow[] }>("players?activeOnly=0");
      return j.players;
    });
    const list = activeOnly ? all.filter((p) => p.active) : all;
    return [...list].sort(comparePlayers);
  }
  const all = await cachedFetch(CACHE.players, async () => {
    const db = getFirestoreDb();
    const snap = await getDocs(query(collection(db, C.players), orderBy("display_name")));
    return snap.docs.map((d) => playerFromDoc(d));
  });
  const list = activeOnly ? all.filter((p) => p.active) : all;
  return [...list].sort(comparePlayers);
}

export async function fetchPlayerById(id: string): Promise<PlayerRow | null> {
  if (isOfflineDemoData()) {
    return DEMO_PLAYERS.find((p) => p.id === id) ?? null;
  }
  if (isD1Backend()) {
    const cached = await fetchPlayers(false);
    const hit = cached.find((p) => p.id === id);
    if (hit) return hit;
    try {
      const j = await cfJson<{ player: PlayerRow }>(`players/${encodeURIComponent(id)}`);
      return j.player;
    } catch {
      return null;
    }
  }
  const cached = await fetchPlayers(false);
  const hit = cached.find((p) => p.id === id);
  if (hit) return hit;
  const db = getFirestoreDb();
  const d = await getDoc(doc(db, C.players, id));
  if (!d.exists()) return null;
  return playerFromDoc(d);
}

function matchesWithResolvedStatus(matches: MatchRow[], lineups: MatchPlayerRow[]): MatchRow[] {
  return matches.map((m) => ({
    ...m,
    status: resolveMatchStatus(m.status, rosterCountsFromLineups(lineups, m.id)),
  }));
}

async function fetchMatchesRaw(): Promise<MatchRow[]> {
  if (isOfflineDemoData()) {
    return [...DEMO_MATCHES].sort((a, b) => b.played_at.localeCompare(a.played_at));
  }
  if (isD1Backend()) {
    return cachedFetch(CACHE.matches, async () => {
      const j = await cfJson<{ matches: MatchRow[] }>("matches");
      return j.matches;
    });
  }
  return cachedFetch(CACHE.matches, async () => {
    const db = getFirestoreDb();
    const snap = await getDocs(query(collection(db, C.matches), orderBy("played_at", "desc")));
    return snap.docs.map((d) => matchFromDoc(d));
  });
}

/**
 * Lista de partidos sin forzar lectura de nóminas.
 * Usa el status guardado (suficiente para listados).
 */
export async function fetchMatchesList(): Promise<MatchRow[]> {
  return fetchMatchesRaw();
}

/** Partidos con status resuelto según nómina (tabla, scoring, etc.). */
export async function fetchMatches(): Promise<MatchRow[]> {
  if (isOfflineDemoData()) {
    return matchesWithResolvedStatus(
      [...DEMO_MATCHES].sort((a, b) => b.played_at.localeCompare(a.played_at)),
      DEMO_LINEUPS
    );
  }
  const [raw, lineups] = await Promise.all([fetchMatchesRaw(), fetchMatchLineups()]);
  return matchesWithResolvedStatus(raw, lineups);
}

export async function fetchMatchLineups(): Promise<MatchPlayerRow[]> {
  if (isOfflineDemoData()) {
    return [...DEMO_LINEUPS];
  }
  if (isD1Backend()) {
    return cachedFetch(CACHE.lineups, async () => {
      const j = await cfJson<{ rows: MatchPlayerRow[] }>("match_players");
      return j.rows;
    });
  }
  return cachedFetch(CACHE.lineups, async () => {
    const db = getFirestoreDb();
    const snap = await getDocs(collection(db, C.matchPlayers));
    return snap.docs.map((d) => {
      const x = d.data();
      return {
        match_id: String(x.match_id),
        player_id: String(x.player_id),
        team: rosterTeamFromFirestore(x.team),
      };
    });
  });
}

export async function fetchMatchGoals(): Promise<MatchGoalRow[]> {
  if (isOfflineDemoData()) {
    return [...DEMO_GOALS];
  }
  if (isD1Backend()) {
    return cachedFetch(CACHE.goals, async () => {
      const j = await cfJson<{ rows: MatchGoalRow[] }>("match_goals");
      return j.rows;
    });
  }
  return cachedFetch(CACHE.goals, async () => {
    const db = getFirestoreDb();
    const snap = await getDocs(collection(db, C.matchGoals));
    return snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        match_id: String(x.match_id),
        player_id: String(x.player_id),
        goals: Number(x.goals ?? 1),
      };
    });
  });
}

export async function fetchConfirmations(): Promise<MatchConfirmationRow[]> {
  if (isOfflineDemoData()) {
    return [...DEMO_CONFIRMATIONS];
  }
  if (isD1Backend()) {
    return cachedFetch(CACHE.confirmations, async () => {
      const j = await cfJson<{ rows: MatchConfirmationRow[] }>("match_confirmations");
      return j.rows.map((row) => {
        const st = String(row.status);
        const status = st === "maybe" || st === "declined" ? st : ("confirmed" as const);
        return { ...row, status };
      });
    });
  }
  return cachedFetch(CACHE.confirmations, async () => {
    const db = getFirestoreDb();
    const snap = await getDocs(collection(db, C.matchConfirmations));
    return snap.docs.map((d) => {
      const x = d.data();
      const st = String(x.status);
      const status = st === "maybe" || st === "declined" ? st : ("confirmed" as const);
      return {
        match_id: String(x.match_id),
        player_id: String(x.player_id),
        status,
        updated_at: isoFromField(x.updated_at),
      };
    });
  });
}

export type TournamentSnapshot = {
  players: PlayerRow[];
  matches: MatchRow[];
  lineups: MatchPlayerRow[];
  goals: MatchGoalRow[];
  confirmations: MatchConfirmationRow[];
};

/** Bundle tipico de tabla / goleadores / ficha: una sola fan-out deduplicada. */
export async function fetchTournamentSnapshot(opts?: {
  activePlayersOnly?: boolean;
  confirmations?: boolean;
  goals?: boolean;
}): Promise<TournamentSnapshot> {
  const activePlayersOnly = opts?.activePlayersOnly !== false;
  const needConfirmations = opts?.confirmations === true;
  const needGoals = opts?.goals !== false;

  const [players, matches, lineups, goals, confirmations] = await Promise.all([
    fetchPlayers(activePlayersOnly),
    fetchMatches(),
    fetchMatchLineups(),
    needGoals ? fetchMatchGoals() : Promise.resolve([] as MatchGoalRow[]),
    needConfirmations ? fetchConfirmations() : Promise.resolve([] as MatchConfirmationRow[]),
  ]);

  return { players, matches, lineups, goals, confirmations };
}

function matchDetailsWithResolvedStatus(m: MatchWithDetails): MatchWithDetails {
  return {
    ...m,
    status: resolveMatchStatus(m.status, rosterCountsFromDetails(m.match_players)),
  };
}

function buildMatchDetails(
  match: MatchRow,
  lineups: MatchPlayerRow[],
  goals: MatchGoalRow[],
  players: PlayerRow[]
): MatchWithDetails {
  const byId = new Map(players.map((p) => [p.id, p]));
  const rows = lineups.filter((l) => l.match_id === match.id);
  const match_players = rows.map((r) => {
    const p = byId.get(r.player_id);
    return {
      team: r.team,
      players: p
        ? {
            id: p.id,
            display_name: p.display_name,
            nickname: p.nickname,
            avatar_url: p.avatar_url,
          }
        : null,
    };
  });
  const match_goals = goals
    .filter((g) => g.match_id === match.id)
    .map((g) => ({ id: g.id, player_id: g.player_id, goals: g.goals }));
  return matchDetailsWithResolvedStatus({ ...match, match_players, match_goals });
}

export async function fetchMatchById(matchId: string): Promise<MatchWithDetails | null> {
  if (isOfflineDemoData()) {
    const m = demoMatchById(matchId);
    return m ? matchDetailsWithResolvedStatus(m) : null;
  }
  if (isD1Backend()) {
    try {
      const j = await cfJson<{ match: MatchWithDetails }>(`matches/${encodeURIComponent(matchId)}`);
      return matchDetailsWithResolvedStatus(j.match);
    } catch {
      return null;
    }
  }

  const [rawMatches, lineups, goals, players] = await Promise.all([
    fetchMatchesRaw(),
    fetchMatchLineups(),
    fetchMatchGoals(),
    fetchPlayers(false),
  ]);

  let match = rawMatches.find((m) => m.id === matchId) ?? null;
  if (!match) {
    const db = getFirestoreDb();
    const mSnap = await getDoc(doc(db, C.matches, matchId));
    if (!mSnap.exists()) return null;
    match = matchFromDoc(mSnap);
    invalidateQueryCache(CACHE.matches);
  }

  return buildMatchDetails(match, lineups, goals, players);
}

export async function isUserAdmin(uid: string): Promise<boolean> {
  if (isOfflineDemoData()) {
    return false;
  }
  if (isD1Backend()) {
    return cachedFetch(CACHE.admin(uid || "d1"), async () => {
      const j = await cfJson<{ user: { email: string } | null }>("auth/me");
      return Boolean(j.user);
    });
  }
  return cachedFetch(CACHE.admin(uid), async () => {
    const db = getFirestoreDb();
    const ad = await getDoc(doc(db, C.admins, uid));
    return ad.exists();
  });
}

/** Borra documentos de una colección con un campo igual a value (en batches de 450). */
export async function deleteDocsWhere(
  collectionName: string,
  field: string,
  value: string
): Promise<void> {
  if (isOfflineDemoData()) {
    return;
  }
  if (isD1Backend()) {
    return;
  }
  const db = getFirestoreDb();
  const qy = query(collection(db, collectionName), where(field, "==", value));
  const snap = await getDocs(qy);
  const docs = snap.docs;
  if (docs.length === 0) return;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export type SaveMatchD1Body = {
  id?: string | null;
  mode: "scheduled" | "loaded" | "teams" | "played";
  played_at: string;
  notes: string | null;
  team_a_score?: number;
  team_b_score?: number;
  golden_goal_winner?: Team | null;
  pool?: string[];
  teams?: { A: string[]; B: string[] };
  goals?: Record<string, number>;
};

export async function saveMatchD1(body: SaveMatchD1Body): Promise<{ id: string }> {
  const result = await cfJson<{ id: string }>("matches/save", {
    method: "POST",
    body: JSON.stringify(body),
  });
  invalidateTournamentDataCache();
  return result;
}

export async function d1CreatePlayer(
  display_name: string,
  opts?: { nickname?: string | null; guest?: boolean }
): Promise<PlayerRow> {
  const player = await cfJson<PlayerRow>("players", {
    method: "POST",
    body: JSON.stringify({
      display_name,
      nickname: opts?.nickname ?? null,
      guest: opts?.guest ?? false,
    }),
  });
  invalidateTournamentDataCache();
  return player;
}

export async function createGuestPlayer(label: string): Promise<PlayerRow> {
  const name = label.trim();
  if (!name) throw new Error("Nombre de invitado vacío");
  if (isOfflineDemoData()) {
    throw new Error("Modo demo: conectá Firebase o D1 para crear invitados.");
  }
  if (isD1Backend()) {
    return d1CreatePlayer(name, { nickname: name, guest: true });
  }
  const db = getFirestoreDb();
  const created_at = new Date().toISOString();
  const ref = await addDoc(collection(db, C.players), {
    display_name: name,
    nickname: name,
    guest: true,
    active: true,
    created_at,
  });
  invalidateTournamentDataCache();
  return {
    id: ref.id,
    display_name: name,
    nickname: name,
    avatar_url: null,
    active: true,
    guest: true,
    created_at,
  };
}

export async function d1UpdatePlayer(
  id: string,
  patch: Partial<Pick<PlayerRow, "display_name" | "nickname" | "active" | "guest" | "draft_seed">>
): Promise<void> {
  await cfJson(`players/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
  invalidateTournamentDataCache();
}
