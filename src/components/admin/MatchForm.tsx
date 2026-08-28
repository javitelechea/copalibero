"use client";

import { useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, updateDoc, writeBatch } from "firebase/firestore/lite";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { getFirestoreDb } from "@/lib/firebase/client";
import { isD1Backend, isOfflineDemoData } from "@/lib/env";
import {
  deleteDocsWhere,
  createGuestPlayer,
  d1CreatePlayer,
  invalidateTournamentDataCache,
  saveMatchD1,
} from "@/lib/firestore-queries";
import { isGuestPlayer } from "@/lib/player-guest";
import { comparePlayers, playerLabel } from "@/lib/player-label";
import { MATCH_PASTE_EXAMPLE, parseMatchPaste } from "@/lib/match-paste-parser";
import { teamDisplayName } from "@/lib/team-labels";
import type { MatchWithDetails, PlayerRow, Team } from "@/lib/types";

function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function playerMatchesQuery(p: PlayerRow, rawQuery: string) {
  const q = normalizeSearch(rawQuery.trim());
  if (!q) return true;
  return (
    normalizeSearch(p.display_name).includes(q) ||
    normalizeSearch(p.nickname ?? "").includes(q) ||
    normalizeSearch(playerLabel(p)).includes(q)
  );
}

export type MatchFormCreateDefaults = {
  playedAt: string;
  notes: string;
  status?: "scheduled" | "loaded" | "teams";
};

type Props = {
  players: PlayerRow[];
  initialMatch?: MatchWithDetails | null;
  createDefaults?: MatchFormCreateDefaults | null;
};

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

function ghostPlayerFromMatch(
  r: MatchWithDetails["match_players"][number]
): PlayerRow | null {
  if (!r.players) return null;
  return {
    id: r.players.id,
    display_name: r.players.display_name,
    nickname: r.players.nickname ?? null,
    avatar_url: r.players.avatar_url,
    active: false,
    guest: false,
    created_at: "",
  };
}

function TeamLetterButton({
  letter,
  label,
  selected,
  onClick,
}: {
  letter: "B" | "N";
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const selectedClass =
    letter === "B"
      ? "border-white bg-white text-black shadow-[0_0_0_2px_rgba(255,255,255,0.55)]"
      : "border-white bg-black text-white shadow-[0_0_0_2px_#2ef0a0]";
  const idleClass =
    letter === "B"
      ? "border-white/40 bg-white/10 text-white/70 hover:bg-white/20"
      : "border-white/25 bg-zinc-800 text-white/50 hover:border-white/50 hover:text-fg";

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={selected ? `Quitar de ${label}` : `Asignar a ${label}`}
      onClick={onClick}
      className={`flex size-11 shrink-0 items-center justify-center rounded-xl border text-sm font-black tabular-nums ${
        selected ? selectedClass : idleClass
      }`}
    >
      {letter}
    </button>
  );
}

export function MatchForm({ players, initialMatch, createDefaults }: Props) {
  const router = useRouter();
  const editId = initialMatch?.id;
  const offlineDemo = isOfflineDemoData();
  const [extraPlayers, setExtraPlayers] = useState<PlayerRow[]>([]);
  const [showCreatePlayer, setShowCreatePlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNickname, setNewPlayerNickname] = useState("");
  const [newPlayerGuest, setNewPlayerGuest] = useState(false);
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [createPlayerMsg, setCreatePlayerMsg] = useState("");
  const [query, setQuery] = useState("");
  const newPlayerNameRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const mergedPlayers = useMemo(() => {
    const m = new Map(players.map((p) => [p.id, p]));
    for (const p of extraPlayers) m.set(p.id, p);
    initialMatch?.match_players.forEach((r) => {
      const g = ghostPlayerFromMatch(r);
      if (g && !m.has(g.id)) m.set(g.id, g);
    });
    return [...m.values()];
  }, [players, initialMatch, extraPlayers]);

  const byId = useMemo(() => new Map(mergedPlayers.map((p) => [p.id, p])), [mergedPlayers]);

  const [playedAt, setPlayedAt] = useState(
    initialMatch
      ? toDateInput(initialMatch.played_at)
      : (createDefaults?.playedAt ?? toDateInput(new Date().toISOString()))
  );
  const [notes, setNotes] = useState(initialMatch?.notes ?? createDefaults?.notes ?? "");
  const [goldenGoal, setGoldenGoal] = useState(Boolean(initialMatch?.golden_goal_winner));

  const [teamA, setTeamA] = useState<Set<string>>(() => {
    const s = new Set<string>();
    initialMatch?.match_players.forEach((r) => {
      if (r.team === "A" && r.players?.id) s.add(r.players.id);
    });
    return s;
  });
  const [teamB, setTeamB] = useState<Set<string>>(() => {
    const s = new Set<string>();
    initialMatch?.match_players.forEach((r) => {
      if (r.team === "B" && r.players?.id) s.add(r.players.id);
    });
    return s;
  });
  const [goals, setGoals] = useState<Record<string, number>>(() => {
    const g: Record<string, number> = {};
    initialMatch?.match_goals.forEach((row) => {
      g[row.player_id] = (g[row.player_id] ?? 0) + row.goals;
    });
    return g;
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteMsg, setPasteMsg] = useState("");

  const inMatch = useMemo(() => new Set([...teamA, ...teamB]), [teamA, teamB]);

  const rosterForPicker = useMemo(() => {
    return [...mergedPlayers]
      .filter((p) => p.active || inMatch.has(p.id))
      .sort((a, b) => {
        const ga = isGuestPlayer(a) ? 1 : 0;
        const gb = isGuestPlayer(b) ? 1 : 0;
        if (ga !== gb) return ga - gb;
        return comparePlayers(a, b);
      });
  }, [mergedPlayers, inMatch]);

  const filteredRoster = useMemo(
    () => rosterForPicker.filter((p) => playerMatchesQuery(p, query)),
    [rosterForPicker, query]
  );

  const teamASorted = useMemo(() => {
    return [...teamA]
      .map((id) => byId.get(id))
      .filter((p): p is PlayerRow => p != null)
      .sort(comparePlayers);
  }, [teamA, byId]);

  const teamBSorted = useMemo(() => {
    return [...teamB]
      .map((id) => byId.get(id))
      .filter((p): p is PlayerRow => p != null)
      .sort(comparePlayers);
  }, [teamB, byId]);

  const goalsSumA = useMemo(
    () => teamASorted.reduce((sum, p) => sum + (goals[p.id] ?? 0), 0),
    [teamASorted, goals]
  );
  const goalsSumB = useMemo(
    () => teamBSorted.reduce((sum, p) => sum + (goals[p.id] ?? 0), 0),
    [teamBSorted, goals]
  );

  const aScore = goalsSumA;
  const bScore = goalsSumB;
  const isDraw = aScore === bScore;
  const ggEligible = Math.abs(aScore - bScore) === 1;
  const saveAsGoldenGoal = goldenGoal && ggEligible;

  function clearSearchIfNeeded() {
    if (!query.trim()) return;
    setQuery("");
    queueMicrotask(() => searchRef.current?.focus());
  }

  function assignToTeam(playerId: string, team: "A" | "B") {
    setTeamA((a) => {
      const n = new Set(a);
      n.delete(playerId);
      if (team === "A") n.add(playerId);
      return n;
    });
    setTeamB((b) => {
      const n = new Set(b);
      n.delete(playerId);
      if (team === "B") n.add(playerId);
      return n;
    });
  }

  function removeFromTeam(playerId: string) {
    setTeamA((a) => {
      const n = new Set(a);
      n.delete(playerId);
      return n;
    });
    setTeamB((b) => {
      const n = new Set(b);
      n.delete(playerId);
      return n;
    });
    setGoals((g) => {
      if (!(playerId in g)) return g;
      const next = { ...g };
      delete next[playerId];
      return next;
    });
  }

  function pickTeam(playerId: string, team: "A" | "B") {
    const already = team === "A" ? teamA.has(playerId) : teamB.has(playerId);
    if (already) removeFromTeam(playerId);
    else assignToTeam(playerId, team);
    clearSearchIfNeeded();
  }

  function openCreatePlayer() {
    setShowCreatePlayer(true);
    setCreatePlayerMsg("");
    setNewPlayerGuest(false);
    setNewPlayerNickname("");
    const q = query.trim();
    if (q) setNewPlayerName(q);
    queueMicrotask(() => newPlayerNameRef.current?.focus());
  }

  function closeCreatePlayer() {
    setShowCreatePlayer(false);
    setNewPlayerName("");
    setNewPlayerNickname("");
    setNewPlayerGuest(false);
    setCreatePlayerMsg("");
  }

  async function createPlayerInline(team?: "A" | "B") {
    const name = newPlayerName.trim();
    const nick = newPlayerNickname.trim();
    if (!name && !nick) return;
    if (offlineDemo) {
      setCreatePlayerMsg("Modo demo: conectá Firebase o D1 para crear jugadores.");
      return;
    }
    if (creatingPlayer) return;
    const display_name = name || nick;
    const nickname = nick || null;
    setCreatingPlayer(true);
    setCreatePlayerMsg("");
    try {
      let created: PlayerRow;
      if (isD1Backend()) {
        created = await d1CreatePlayer(display_name, {
          nickname,
          guest: newPlayerGuest,
        });
      } else {
        const db = getFirestoreDb();
        const created_at = new Date().toISOString();
        const ref = await addDoc(collection(db, "players"), {
          display_name,
          nickname,
          guest: newPlayerGuest,
          active: true,
          created_at,
        });
        created = {
          id: ref.id,
          display_name,
          nickname,
          active: true,
          guest: newPlayerGuest,
          avatar_url: null,
          created_at,
          draft_seed: null,
        };
        invalidateTournamentDataCache();
      }
      setExtraPlayers((prev) => (prev.some((p) => p.id === created.id) ? prev : [...prev, created]));
      if (team) assignToTeam(created.id, team);
      setQuery("");
      closeCreatePlayer();
    } catch (err) {
      setCreatePlayerMsg(err instanceof Error ? err.message : "Error al crear jugador");
    } finally {
      setCreatingPlayer(false);
    }
  }

  function adjustGoal(playerId: string, delta: number) {
    setGoals((g) => {
      const next = { ...g };
      const cur = next[playerId] ?? 0;
      const n = Math.max(0, cur + delta);
      if (n <= 0) delete next[playerId];
      else next[playerId] = n;
      return next;
    });
  }

  async function applyPaste() {
    setPasteMsg("");
    setError("");

    let roster = mergedPlayers;
    let first = parseMatchPaste(pasteText, roster);
    if (first.errors.length > 0) {
      setPasteMsg(first.errors.join("\n"));
      return;
    }

    const created: PlayerRow[] = [];
    try {
      for (const g of first.pendingGuests) {
        const p = await createGuestPlayer(g.name);
        created.push(p);
      }
    } catch (err) {
      setPasteMsg(err instanceof Error ? err.message : "Error al crear invitados");
      return;
    }

    if (created.length > 0) {
      setExtraPlayers((prev) => [...prev, ...created]);
      roster = [...roster, ...created];
      first = parseMatchPaste(pasteText, roster);
      if (first.errors.length > 0) {
        setPasteMsg(first.errors.join("\n"));
        return;
      }
    }

    const result = first;
    const nextA = new Set<string>();
    const nextB = new Set<string>();
    const nextGoals: Record<string, number> = {};

    for (const row of result.teamA) {
      nextA.add(row.playerId);
      if (row.goals > 0) nextGoals[row.playerId] = row.goals;
    }
    for (const row of result.teamB) {
      nextB.add(row.playerId);
      if (row.goals > 0) nextGoals[row.playerId] = row.goals;
    }

    setTeamA(nextA);
    setTeamB(nextB);
    setGoals(nextGoals);
    setGoldenGoal(false);
    const guestNote =
      created.length > 0
        ? ` · ${created.length} invitado${created.length > 1 ? "s" : ""} creado${created.length > 1 ? "s" : ""}`
        : "";
    setPasteMsg(
      `Listo: ${result.teamA.length + result.teamB.length} jugadores, ${teamDisplayName("A")} ${result.scoreA}–${result.scoreB} ${teamDisplayName("B")}.${guestNote}`
    );
  }

  function validateTeamsForSave(): string | null {
    if (teamA.size === 0 || teamB.size === 0) {
      return `Asigná al menos un jugador a ${teamDisplayName("A")} y uno a ${teamDisplayName("B")} con B y N.`;
    }
    const overlap = [...teamA].filter((id) => teamB.has(id));
    if (overlap.length) {
      return "Un jugador no puede estar en los dos equipos.";
    }
    return null;
  }

  function goldenGoalWinnerForSave(): Team | null {
    if (!saveAsGoldenGoal) return null;
    return aScore > bScore ? "A" : "B";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const teamErr = validateTeamsForSave();
    if (teamErr) {
      setError(teamErr);
      return;
    }

    setLoading(true);
    try {
      const ggWinner = goldenGoalWinnerForSave();
      if (isD1Backend()) {
        await saveMatchD1({
          id: editId ?? null,
          mode: "played",
          played_at: playedAt,
          notes: notes.trim() || null,
          team_a_score: aScore,
          team_b_score: bScore,
          golden_goal_winner: ggWinner,
          teams: { A: [...teamA], B: [...teamB] },
          goals,
        });
        invalidateTournamentDataCache();
        router.push("/admin/partidos");
        router.refresh();
        return;
      }
      const db = getFirestoreDb();
      let matchId = editId;

      if (editId) {
        await updateDoc(doc(db, "matches", editId), {
          played_at: playedAt,
          team_a_score: aScore,
          team_b_score: bScore,
          golden_goal_winner: ggWinner,
          status: "played",
          notes: notes.trim() || null,
        });
        await deleteDocsWhere("match_players", "match_id", editId);
        await deleteDocsWhere("match_goals", "match_id", editId);
        matchId = editId;
      } else {
        const ref = await addDoc(collection(db, "matches"), {
          played_at: playedAt,
          team_a_score: aScore,
          team_b_score: bScore,
          golden_goal_winner: ggWinner,
          status: "played",
          notes: notes.trim() || null,
          created_at: new Date().toISOString(),
        });
        matchId = ref.id;
      }

      const ops: { type: "lineup" | "goal"; payload: Record<string, unknown> }[] = [];
      for (const player_id of [...teamA]) {
        ops.push({ type: "lineup", payload: { match_id: matchId, player_id, team: "A" } });
      }
      for (const player_id of [...teamB]) {
        ops.push({ type: "lineup", payload: { match_id: matchId, player_id, team: "B" } });
      }
      for (const [player_id, total] of Object.entries(goals)) {
        if (total <= 0 || !inMatch.has(player_id)) continue;
        ops.push({
          type: "goal",
          payload: { match_id: matchId, player_id, goals: total },
        });
      }

      for (let i = 0; i < ops.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = ops.slice(i, i + 450);
        for (const op of chunk) {
          const col = op.type === "lineup" ? "match_players" : "match_goals";
          const r = doc(collection(db, col));
          batch.set(r, op.payload);
        }
        await batch.commit();
      }

      invalidateTournamentDataCache();
      router.push("/admin/partidos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  const teamsStarted = teamA.size > 0 || teamB.size > 0;
  const assignedCount = teamA.size + teamB.size;

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-6">
      <div className="grid gap-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Fecha</span>
          <input
            type="date"
            required
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 outline-none ring-accent/20 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Notas (horario, lugar…)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej. 22 h · Libero Futbol Lomas"
            className="mt-1 w-full resize-y rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none ring-accent/20 focus:ring-2"
          />
        </label>
      </div>

      <details className="rounded-2xl border border-border bg-surface-2 p-4">
        <summary className="cursor-pointer text-sm font-bold text-muted">
          Atajo · Pegar resultado
        </summary>
        <p className="mt-2 text-xs text-muted">
          Pegá una línea por equipo con apodos y goles. Marcá invitados con{" "}
          <code className="text-fg">(invitado*)</code> para crearlos si no existen.
        </p>
        <textarea
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value);
            setPasteMsg("");
          }}
          rows={4}
          placeholder={MATCH_PASTE_EXAMPLE}
          className="mt-3 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 font-mono text-xs outline-none ring-accent/20 focus:ring-2"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPaste()}
            disabled={!pasteText.trim()}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-canvas disabled:opacity-50"
          >
            Cargar equipos y goles
          </button>
          <button
            type="button"
            onClick={() => {
              setPasteText(MATCH_PASTE_EXAMPLE);
              setPasteMsg("");
            }}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:text-fg"
          >
            Ver ejemplo
          </button>
        </div>
        {pasteMsg ? (
          <p
            className={`mt-3 whitespace-pre-wrap text-sm ${
              pasteMsg.startsWith("Listo:") ? "text-accent" : "text-red-400"
            }`}
          >
            {pasteMsg}
          </p>
        ) : null}
      </details>

      <div className="rounded-2xl border border-border bg-surface-2 px-4 py-4">
        <p className="text-center text-xs font-bold uppercase tracking-wide text-muted">
          Resultado
        </p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {teamDisplayName("A")}
            </p>
            <p className="font-mono text-4xl font-black tabular-nums">{aScore}</p>
          </div>
          <span className="text-2xl font-black text-muted">–</span>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {teamDisplayName("B")}
            </p>
            <p className="font-mono text-4xl font-black tabular-nums">{bScore}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-sm font-medium">
          {saveAsGoldenGoal
            ? "Empate · gol de oro"
            : isDraw
              ? aScore === 0 && bScore === 0
                ? "Cargá los goles abajo"
                : "Empate"
              : `Gana ${teamDisplayName(aScore > bScore ? "A" : "B")}`}
        </p>
        <button
          type="button"
          disabled={!ggEligible}
          aria-pressed={saveAsGoldenGoal}
          onClick={() => setGoldenGoal((v) => !v)}
          className={`mt-4 flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
            saveAsGoldenGoal
              ? "border-accent bg-accent/20"
              : ggEligible
                ? "border-border bg-surface hover:border-accent/50"
                : "cursor-not-allowed border-border bg-surface/50 opacity-50"
          }`}
        >
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-md border-2 text-sm font-black ${
              saveAsGoldenGoal
                ? "border-accent bg-accent text-canvas"
                : "border-muted text-transparent"
            }`}
          >
            ✓
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">Gol de oro</span>
            <span className="block text-xs text-muted">
              {ggEligible
                ? saveAsGoldenGoal
                  ? "Marcado. El marcador no cambia; en la tabla suma distinto."
                  : "Tocá acá si se definió por gol de oro."
                : "Se puede marcar cuando un equipo gana por un gol."}
            </span>
          </span>
        </button>
      </div>

      <section className="rounded-2xl border border-border bg-surface-2 p-4">
        <div className="sticky top-14 z-10 -mx-4 bg-surface-2/95 px-4 pb-3 pt-1 backdrop-blur">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Jugadores</h2>
            <span className="text-xs font-medium tabular-nums text-muted">
              {teamDisplayName("A")} {teamA.size} · {teamDisplayName("B")} {teamB.size}
              {teamsStarted ? ` · ${aScore}–${bScore}` : ""}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Buscá un nombre y tocá <span className="font-bold text-fg">B</span> (Blanco) o{" "}
            <span className="font-bold text-fg">N</span> (Negro). Tocá de nuevo para sacar.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar jugador…"
                autoComplete="off"
                className="min-h-[48px] w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none ring-accent/20 focus:ring-2"
              />
            </div>
            <button
              type="button"
              disabled={offlineDemo}
              onClick={openCreatePlayer}
              aria-label="Nuevo jugador"
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent font-bold text-canvas disabled:opacity-50"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showCreatePlayer ? (
          <div className="mt-3 rounded-xl border border-accent/40 bg-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Nuevo jugador</h3>
              <button
                type="button"
                onClick={closeCreatePlayer}
                className="text-xs font-medium text-muted hover:text-fg"
              >
                Cerrar
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  ref={newPlayerNameRef}
                  placeholder="Nombre completo"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="min-h-[44px] flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-accent/20 focus:ring-2"
                />
                <input
                  placeholder="Apodo (visible en partidos)"
                  value={newPlayerNickname}
                  onChange={(e) => setNewPlayerNickname(e.target.value)}
                  className="min-h-[44px] flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-accent/20 focus:ring-2"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={newPlayerGuest}
                  onChange={(e) => setNewPlayerGuest(e.target.checked)}
                  className="size-4 rounded border-border accent-amber-500"
                />
                Invitado (no suma en la tabla general ni en goleadores)
              </label>
              <p className="text-xs text-muted">Creá y asignalo al equipo en el mismo toque.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    creatingPlayer ||
                    offlineDemo ||
                    (!newPlayerName.trim() && !newPlayerNickname.trim())
                  }
                  onClick={() => void createPlayerInline("A")}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/15 text-sm font-bold disabled:opacity-50"
                >
                  {creatingPlayer ? "Creando…" : "Crear en Blanco"}
                </button>
                <button
                  type="button"
                  disabled={
                    creatingPlayer ||
                    offlineDemo ||
                    (!newPlayerName.trim() && !newPlayerNickname.trim())
                  }
                  onClick={() => void createPlayerInline("B")}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-black/40 text-sm font-bold disabled:opacity-50"
                >
                  {creatingPlayer ? "Creando…" : "Crear en Negro"}
                </button>
              </div>
              {createPlayerMsg ? (
                <p className="text-sm text-red-400">{createPlayerMsg}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {query.trim() && filteredRoster.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No hay coincidencias con «{query.trim()}». Tocá{" "}
            <span className="font-semibold text-fg">+</span> para crearlo y asignarlo a un equipo.
          </p>
        ) : null}

        <ul className="mt-3 flex flex-col gap-1.5">
          {filteredRoster.map((p) => {
            const onA = teamA.has(p.id);
            const onB = teamB.has(p.id);
            return (
              <li
                key={`disp-${p.id}`}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${
                  onA
                    ? "border-white/60 bg-white/15"
                    : onB
                      ? "border-accent/70 bg-black"
                      : "border-border bg-surface"
                }`}
              >
                <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{playerLabel(p)}</p>
                  <p className="flex flex-wrap items-center gap-1.5">
                    {onA || onB ? (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide ${
                          onA ? "text-white" : "text-accent"
                        }`}
                      >
                        {onA ? "Blanco" : "Negro"}
                      </span>
                    ) : null}
                    {isGuestPlayer(p) ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400">
                        Invitado
                      </span>
                    ) : null}
                  </p>
                </div>
                <TeamLetterButton
                  letter="B"
                  label={teamDisplayName("A")}
                  selected={onA}
                  onClick={() => pickTeam(p.id, "A")}
                />
                <TeamLetterButton
                  letter="N"
                  label={teamDisplayName("B")}
                  selected={onB}
                  onClick={() => pickTeam(p.id, "B")}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {teamsStarted ? (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Goles por jugador</h2>
            <p className="mt-1 text-xs text-muted">
              Tocá − o + en cada uno. El marcador se arma solo con esos goles.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  {teamDisplayName("A")} ({teamA.size})
                </h3>
                <span className="text-xs font-semibold tabular-nums text-fg">
                  {goalsSumA} goles
                </span>
              </div>
              {teamASorted.length === 0 ? (
                <p className="text-sm text-muted">Nadie todavía. Tocá B en la lista.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {teamASorted.map((p) => {
                    const n = goals[p.id] ?? 0;
                    return (
                      <li
                        key={`ga-${p.id}`}
                        className={`rounded-xl border px-3 py-2.5 ${
                          n > 0 ? "border-white/30 bg-white/10" : "border-border bg-surface"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={32} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {playerLabel(p)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            aria-label={`Menos goles de ${playerLabel(p)}`}
                            disabled={n <= 0}
                            onClick={() => adjustGoal(p.id, -1)}
                            className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-xl font-bold text-fg transition hover:bg-surface disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="min-w-[2.5rem] text-center text-lg font-black tabular-nums">
                            {n}
                          </span>
                          <button
                            type="button"
                            aria-label={`Más goles de ${playerLabel(p)}`}
                            onClick={() => adjustGoal(p.id, 1)}
                            className="flex size-11 items-center justify-center rounded-xl border border-white/40 bg-white/15 text-xl font-bold transition hover:bg-white/25"
                          >
                            +
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  {teamDisplayName("B")} ({teamB.size})
                </h3>
                <span className="text-xs font-semibold tabular-nums text-fg">
                  {goalsSumB} goles
                </span>
              </div>
              {teamBSorted.length === 0 ? (
                <p className="text-sm text-muted">Nadie todavía. Tocá N en la lista.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {teamBSorted.map((p) => {
                    const n = goals[p.id] ?? 0;
                    return (
                      <li
                        key={`gb-${p.id}`}
                        className={`rounded-xl border px-3 py-2.5 ${
                          n > 0 ? "border-white/20 bg-black/40" : "border-border bg-surface"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={32} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {playerLabel(p)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            aria-label={`Menos goles de ${playerLabel(p)}`}
                            disabled={n <= 0}
                            onClick={() => adjustGoal(p.id, -1)}
                            className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-xl font-bold text-fg transition hover:bg-surface disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="min-w-[2.5rem] text-center text-lg font-black tabular-nums">
                            {n}
                          </span>
                          <button
                            type="button"
                            aria-label={`Más goles de ${playerLabel(p)}`}
                            onClick={() => adjustGoal(p.id, 1)}
                            className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl font-bold transition hover:bg-white/20"
                          >
                            +
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {error && (
        <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="min-h-[52px] rounded-xl bg-accent text-base font-bold text-canvas transition hover:opacity-90 disabled:opacity-50"
      >
        {loading
          ? "Guardando…"
          : editId
            ? assignedCount > 0
              ? `Guardar partido · ${aScore}–${bScore}`
              : "Guardar partido"
            : assignedCount > 0
              ? `Guardar partido · ${aScore}–${bScore}`
              : "Guardar partido"}
      </button>
    </form>
  );
}
