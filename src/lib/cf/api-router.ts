import type { D1PreparedStatement } from "@cloudflare/workers-types";
import bcrypt from "bcryptjs";
import { getD1, getSessionSecret } from "@/lib/cf/d1-context";
import {
  clearSessionCookie,
  readSessionCookie,
  sessionCookieHeader,
  signSession,
  verifySession,
} from "@/lib/cf/session-cookie";

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...init.headers },
  });
}

async function requireAdmin(request: Request): Promise<{ email: string } | Response> {
  const token = readSessionCookie(request);
  if (!token) return json({ error: "No autenticado" }, { status: 401 });
  const secret = getSessionSecret();
  const s = await verifySession(token, secret);
  if (!s) return json({ error: "Sesión inválida" }, { status: 401 });
  const row = await getD1()
    .prepare("SELECT 1 FROM admins WHERE email = ?")
    .bind(s.email)
    .first();
  if (!row) return json({ error: "No autorizado" }, { status: 403 });
  return s;
}

export async function handleCfApi(request: Request, slug: string[], method: string): Promise<Response> {
  const path = slug.join("/");
  const db = getD1();

  try {
    if (path === "auth/login" && method === "POST") {
      const body = (await request.json()) as { email?: string; password?: string };
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (!email || !password) return json({ error: "Email y contraseña requeridos" }, { status: 400 });
      const row = await db.prepare("SELECT password_hash FROM admins WHERE email = ?").bind(email).first<{ password_hash: string }>();
      if (!row) return json({ error: "Credenciales inválidas" }, { status: 401 });
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) return json({ error: "Credenciales inválidas" }, { status: 401 });
      const token = await signSession(email, getSessionSecret());
      return json({ ok: true }, { headers: { "set-cookie": sessionCookieHeader(token) } });
    }

    if (path === "auth/logout" && method === "POST") {
      return json({ ok: true }, { headers: { "set-cookie": clearSessionCookie() } });
    }

    if (path === "auth/me" && method === "GET") {
      const token = readSessionCookie(request);
      if (!token) return json({ user: null });
      const s = await verifySession(token, getSessionSecret());
      if (!s) return json({ user: null });
      const row = await db.prepare("SELECT 1 FROM admins WHERE email = ?").bind(s.email).first();
      if (!row) return json({ user: null });
      return json({ user: { email: s.email } });
    }

    if (path === "players" && method === "GET") {
      const url = new URL(request.url);
      const activeOnly = url.searchParams.get("activeOnly") !== "0";
      const q = activeOnly
        ? "SELECT id, display_name, active, created_at, draft_seed FROM players WHERE active = 1 ORDER BY display_name"
        : "SELECT id, display_name, active, created_at, draft_seed FROM players ORDER BY display_name";
      const { results } = await db.prepare(q).all<{
        id: string;
        display_name: string;
        active: number;
        created_at: string;
        draft_seed: number | null;
      }>();
      return json({
        players: (results ?? []).map((r) => ({
          id: r.id,
          display_name: r.display_name,
          avatar_url: null,
          active: r.active !== 0,
          created_at: r.created_at,
          draft_seed: r.draft_seed == null || Number.isNaN(Number(r.draft_seed)) ? null : Number(r.draft_seed),
        })),
      });
    }

    const playerGet = path.match(/^players\/([^/]+)$/);
    if (playerGet && method === "GET") {
      const pid = playerGet[1];
      const row = await db
        .prepare("SELECT id, display_name, active, created_at, draft_seed FROM players WHERE id = ?")
        .bind(pid)
        .first<{ id: string; display_name: string; active: number; created_at: string; draft_seed: number | null }>();
      if (!row) return json({ error: "No encontrado" }, { status: 404 });
      return json({
        player: {
          id: row.id,
          display_name: row.display_name,
          avatar_url: null,
          active: row.active !== 0,
          created_at: row.created_at,
          draft_seed:
            row.draft_seed == null || Number.isNaN(Number(row.draft_seed)) ? null : Number(row.draft_seed),
        },
      });
    }

    if (path === "players" && method === "POST") {
      const gate = await requireAdmin(request);
      if (gate instanceof Response) return gate;
      const body = (await request.json()) as { display_name?: string };
      const name = String(body.display_name ?? "").trim();
      if (!name) return json({ error: "Nombre requerido" }, { status: 400 });
      const id = crypto.randomUUID();
      const created = new Date().toISOString();
      await db.prepare("INSERT INTO players (id, display_name, active, created_at) VALUES (?, ?, 1, ?)").bind(id, name, created).run();
      return json({ id, display_name: name, avatar_url: null, active: true, created_at: created, draft_seed: null });
    }

    const playerPatch = path.match(/^players\/([^/]+)$/);
    if (playerPatch && method === "PATCH") {
      const gate = await requireAdmin(request);
      if (gate instanceof Response) return gate;
      const id = playerPatch[1];
      const body = (await request.json()) as Record<string, unknown>;
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (typeof body.display_name === "string") {
        sets.push("display_name = ?");
        vals.push(body.display_name.trim());
      }
      if (typeof body.active === "boolean") {
        sets.push("active = ?");
        vals.push(body.active ? 1 : 0);
      }
      if ("draft_seed" in body) {
        if (body.draft_seed === null || body.draft_seed === undefined) {
          sets.push("draft_seed = NULL");
        } else if (typeof body.draft_seed === "number" && Number.isFinite(body.draft_seed)) {
          sets.push("draft_seed = ?");
          vals.push(Math.trunc(body.draft_seed));
        }
      }
      if (sets.length === 0) return json({ error: "Nada para actualizar" }, { status: 400 });
      vals.push(id);
      await db.prepare(`UPDATE players SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
      return json({ ok: true });
    }

    if (path === "matches" && method === "GET") {
      const { results } = await db
        .prepare(
          "SELECT id, played_at, team_a_score, team_b_score, status, notes, created_at FROM matches ORDER BY played_at DESC"
        )
        .all<{
          id: string;
          played_at: string;
          team_a_score: number;
          team_b_score: number;
          status: string;
          notes: string | null;
          created_at: string;
        }>();
      return json({
        matches: (results ?? []).map((r) => ({
          id: r.id,
          played_at: String(r.played_at).slice(0, 10),
          team_a_score: r.team_a_score,
          team_b_score: r.team_b_score,
          status: r.status === "scheduled" ? "scheduled" : "played",
          notes: r.notes,
          created_at: r.created_at,
        })),
      });
    }

    if (path === "match_players" && method === "GET") {
      const { results } = await db
        .prepare("SELECT match_id, player_id, team FROM match_players")
        .all<{ match_id: string; player_id: string; team: string }>();
      return json({
        rows: (results ?? []).map((r) => ({
          match_id: r.match_id,
          player_id: r.player_id,
          team: r.team === "B" ? "B" : r.team === "pool" ? "pool" : "A",
        })),
      });
    }

    if (path === "match_goals" && method === "GET") {
      const { results } = await db
        .prepare("SELECT id, match_id, player_id, goals FROM match_goals")
        .all<{ id: string; match_id: string; player_id: string; goals: number }>();
      return json({ rows: results ?? [] });
    }

    if (path === "match_confirmations" && method === "GET") {
      const { results } = await db
        .prepare("SELECT match_id, player_id, status, updated_at FROM match_confirmations")
        .all<{ match_id: string; player_id: string; status: string; updated_at: string }>();
      return json({ rows: results ?? [] });
    }

    const matchGet = path.match(/^matches\/([^/]+)$/);
    if (matchGet && method === "GET") {
      const matchId = matchGet[1];
      const m = await db
        .prepare(
          "SELECT id, played_at, team_a_score, team_b_score, status, notes, created_at FROM matches WHERE id = ?"
        )
        .bind(matchId)
        .first<{
          id: string;
          played_at: string;
          team_a_score: number;
          team_b_score: number;
          status: string;
          notes: string | null;
          created_at: string;
        }>();
      if (!m) return json({ error: "No encontrado" }, { status: 404 });
      const line = await db.prepare("SELECT player_id, team FROM match_players WHERE match_id = ?").bind(matchId).all<{ player_id: string; team: string }>();
      const goals = await db.prepare("SELECT id, player_id, goals FROM match_goals WHERE match_id = ?").bind(matchId).all<{ id: string; player_id: string; goals: number }>();
      const pids = [...new Set((line.results ?? []).map((x) => x.player_id))];
      const mini: Record<string, { id: string; display_name: string; avatar_url: null }> = {};
      for (const pid of pids) {
        const p = await db.prepare("SELECT id, display_name FROM players WHERE id = ?").bind(pid).first<{ id: string; display_name: string }>();
        if (p) mini[pid] = { id: p.id, display_name: p.display_name, avatar_url: null };
      }
      const match_players = (line.results ?? []).map((r) => ({
        team: r.team === "B" ? "B" : r.team === "pool" ? "pool" : "A",
        players: mini[r.player_id] ?? null,
      }));
      const match_goals = (goals.results ?? []).map((g) => ({ id: g.id, player_id: g.player_id, goals: g.goals }));
      return json({
        match: {
          id: m.id,
          played_at: String(m.played_at).slice(0, 10),
          team_a_score: m.team_a_score,
          team_b_score: m.team_b_score,
          status: m.status === "scheduled" ? "scheduled" : "played",
          notes: m.notes,
          created_at: m.created_at,
          match_players,
          match_goals,
        },
      });
    }

    if (path === "matches/save" && method === "POST") {
      const gate = await requireAdmin(request);
      if (gate instanceof Response) return gate;
      const b = (await request.json()) as {
        id?: string | null;
        mode: "scheduled" | "played";
        played_at: string;
        notes: string | null;
        team_a_score?: number;
        team_b_score?: number;
        pool?: string[];
        teams?: { A: string[]; B: string[] };
        goals?: Record<string, number>;
      };
      const matchId = b.id && String(b.id).length > 0 ? String(b.id) : crypto.randomUUID();
      const playedAt = String(b.played_at).slice(0, 10);
      const notes = b.notes ?? null;
      const created = new Date().toISOString();

      if (b.mode === "scheduled") {
        await db
          .prepare(
            `INSERT INTO matches (id, played_at, team_a_score, team_b_score, status, notes, created_at)
             VALUES (?, ?, 0, 0, 'scheduled', ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               played_at = excluded.played_at,
               team_a_score = 0,
               team_b_score = 0,
               status = 'scheduled',
               notes = excluded.notes`
          )
          .bind(matchId, playedAt, notes, created)
          .run();
      } else {
        await db
          .prepare(
            `INSERT INTO matches (id, played_at, team_a_score, team_b_score, status, notes, created_at)
             VALUES (?, ?, ?, ?, 'played', ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               played_at = excluded.played_at,
               team_a_score = excluded.team_a_score,
               team_b_score = excluded.team_b_score,
               status = 'played',
               notes = excluded.notes`
          )
          .bind(
            matchId,
            playedAt,
            Number(b.team_a_score ?? 0),
            Number(b.team_b_score ?? 0),
            notes,
            created
          )
          .run();
      }

      await db.prepare("DELETE FROM match_players WHERE match_id = ?").bind(matchId).run();
      await db.prepare("DELETE FROM match_goals WHERE match_id = ?").bind(matchId).run();

      if (b.mode === "scheduled") {
        const pool = b.pool ?? [];
        const stmts = pool.map((player_id) =>
          db
            .prepare("INSERT INTO match_players (id, match_id, player_id, team) VALUES (?, ?, ?, 'pool')")
            .bind(crypto.randomUUID(), matchId, player_id)
        );
        if (stmts.length) await db.batch(stmts);
      } else {
        const A = b.teams?.A ?? [];
        const B = b.teams?.B ?? [];
        const stmts: D1PreparedStatement[] = [];
        for (const player_id of A) {
          stmts.push(
            db.prepare("INSERT INTO match_players (id, match_id, player_id, team) VALUES (?, ?, ?, 'A')").bind(crypto.randomUUID(), matchId, player_id)
          );
        }
        for (const player_id of B) {
          stmts.push(
            db.prepare("INSERT INTO match_players (id, match_id, player_id, team) VALUES (?, ?, ?, 'B')").bind(crypto.randomUUID(), matchId, player_id)
          );
        }
        const inMatch = new Set([...A, ...B]);
        for (const [player_id, n] of Object.entries(b.goals ?? {})) {
          const g = Number(n);
          if (!g || g <= 0 || !inMatch.has(player_id)) continue;
          stmts.push(
            db.prepare("INSERT INTO match_goals (id, match_id, player_id, goals) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), matchId, player_id, g)
          );
        }
        if (stmts.length) await db.batch(stmts);
      }

      return json({ id: matchId });
    }

    return json({ error: `Ruta no encontrada: ${method} /${path}` }, { status: 404 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return json({ error: msg }, { status: 500 });
  }
}
