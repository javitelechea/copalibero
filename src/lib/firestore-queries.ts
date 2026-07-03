import {
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
    const j = await cfJson<{ players: PlayerRow[] }>(`players?activeOnly=${activeOnly ? "1" : "0"}`);
    return j.players;
  }
  const db = getFirestoreDb();
  const snap = await getDocs(query(collection(db, C.players), orderBy("display_name")));
  let list = snap.docs.map((d) => playerFromDoc(d));
  if (activeOnly) list = list.filter((p) => p.active);
  return list;
}

export async function fetchPlayerById(id: string): Promise<PlayerRow | null> {
  if (isOfflineDemoData()) {
    return DEMO_PLAYERS.find((p) => p.id === id) ?? null;
  }
  if (isD1Backend()) {
    try {
      const j = await cfJson<{ player: PlayerRow }>(`players/${encodeURIComponent(id)}`);
      return j.player;
    } catch {
      return null;
    }
  }
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

export async function fetchMatches(): Promise<MatchRow[]> {
  if (isOfflineDemoData()) {
    return matchesWithResolvedStatus(
      [...DEMO_MATCHES].sort((a, b) => b.played_at.localeCompare(a.played_at)),
      DEMO_LINEUPS
    );
  }
  if (isD1Backend()) {
    const [j, lineups] = await Promise.all([
      cfJson<{ matches: MatchRow[] }>("matches"),
      fetchMatchLineups(),
    ]);
    return matchesWithResolvedStatus(j.matches, lineups);
  }
  const db = getFirestoreDb();
  const [snap, lineups] = await Promise.all([
    getDocs(query(collection(db, C.matches), orderBy("played_at", "desc"))),
    fetchMatchLineups(),
  ]);
  return matchesWithResolvedStatus(
    snap.docs.map((d) => matchFromDoc(d)),
    lineups
  );
}

export async function fetchMatchLineups(): Promise<MatchPlayerRow[]> {
  if (isOfflineDemoData()) {
    return [...DEMO_LINEUPS];
  }
  if (isD1Backend()) {
    const j = await cfJson<{ rows: MatchPlayerRow[] }>("match_players");
    return j.rows;
  }
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
}

export async function fetchMatchGoals(): Promise<MatchGoalRow[]> {
  if (isOfflineDemoData()) {
    return [...DEMO_GOALS];
  }
  if (isD1Backend()) {
    const j = await cfJson<{ rows: MatchGoalRow[] }>("match_goals");
    return j.rows;
  }
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
}

export async function fetchConfirmations(): Promise<MatchConfirmationRow[]> {
  if (isOfflineDemoData()) {
    return [...DEMO_CONFIRMATIONS];
  }
  if (isD1Backend()) {
    const j = await cfJson<{ rows: MatchConfirmationRow[] }>("match_confirmations");
    return j.rows.map((row) => {
      const st = String(row.status);
      const status = st === "maybe" || st === "declined" ? st : ("confirmed" as const);
      return { ...row, status };
    });
  }
  const db = getFirestoreDb();
  const snap = await getDocs(collection(db, C.matchConfirmations));
  return snap.docs.map((d) => {
    const x = d.data();
    const st = String(x.status);
    const status =
      st === "maybe" || st === "declined" ? st : ("confirmed" as const);
    return {
      match_id: String(x.match_id),
      player_id: String(x.player_id),
      status,
      updated_at: isoFromField(x.updated_at),
    };
  });
}

function matchDetailsWithResolvedStatus(m: MatchWithDetails): MatchWithDetails {
  return {
    ...m,
    status: resolveMatchStatus(m.status, rosterCountsFromDetails(m.match_players)),
  };
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
  const db = getFirestoreDb();
  const mSnap = await getDoc(doc(db, C.matches, matchId));
  if (!mSnap.exists()) return null;
  const match = matchFromDoc(mSnap);

  const lp = query(collection(db, C.matchPlayers), where("match_id", "==", matchId));
  const ls = await getDocs(lp);
  const rows: MatchPlayerRow[] = ls.docs.map((d) => {
    const x = d.data();
    return {
      match_id: String(x.match_id),
      player_id: String(x.player_id),
      team: rosterTeamFromFirestore(x.team),
    };
  });

  const playerIds = [...new Set(rows.map((r) => r.player_id))];
  const mini = new Map<string, Pick<PlayerRow, "id" | "display_name" | "nickname" | "avatar_url">>();
  await Promise.all(
    playerIds.map(async (pid) => {
      const ps = await getDoc(doc(db, C.players, pid));
      if (!ps.exists()) return;
      const p = playerFromDoc(ps);
      mini.set(pid, {
        id: p.id,
        display_name: p.display_name,
        nickname: p.nickname,
        avatar_url: p.avatar_url,
      });
    })
  );

  const match_players = rows.map((r) => ({
    team: r.team,
    players: mini.get(r.player_id) ?? null,
  }));

  const gq = query(collection(db, C.matchGoals), where("match_id", "==", matchId));
  const gs = await getDocs(gq);
  const match_goals = gs.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      player_id: String(x.player_id),
      goals: Number(x.goals ?? 1),
    };
  });

  return matchDetailsWithResolvedStatus({ ...match, match_players, match_goals });
}

export async function isUserAdmin(uid: string): Promise<boolean> {
  if (isOfflineDemoData()) {
    return false;
  }
  if (isD1Backend()) {
    void uid;
    const j = await cfJson<{ user: { email: string } | null }>("auth/me");
    return Boolean(j.user);
  }
  const db = getFirestoreDb();
  const ad = await getDoc(doc(db, C.admins, uid));
  return ad.exists();
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
  return cfJson("matches/save", { method: "POST", body: JSON.stringify(body) });
}

export async function d1CreatePlayer(display_name: string): Promise<PlayerRow> {
  return cfJson("players", { method: "POST", body: JSON.stringify({ display_name }) });
}

export async function d1UpdatePlayer(
  id: string,
  patch: Partial<Pick<PlayerRow, "display_name" | "nickname" | "active" | "draft_seed">>
): Promise<void> {
  await cfJson(`players/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
}
