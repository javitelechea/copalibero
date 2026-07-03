"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, updateDoc, writeBatch } from "firebase/firestore/lite";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { getFirestoreDb } from "@/lib/firebase/client";
import { isD1Backend } from "@/lib/env";
import { deleteDocsWhere, saveMatchD1 } from "@/lib/firestore-queries";
import {
  resolveMatchStatus,
  rosterCountsFromDetails,
  type MatchRosterCounts,
} from "@/lib/match-status";
import { comparePlayers, playerLabel } from "@/lib/player-label";
import { teamDisplayName } from "@/lib/team-labels";
import type { MatchStatus, MatchWithDetails, PlayerRow, Team } from "@/lib/types";

type MatchFormMode = "scheduled" | "loaded" | "teams" | "played";

function initialMatchMode(
  initialMatch: MatchWithDetails | null | undefined,
  createDefaults: MatchFormCreateDefaults | null | undefined
): MatchFormMode {
  if (initialMatch?.status === "played") return "played";
  if (initialMatch) {
    return resolveMatchStatus(
      initialMatch.status,
      rosterCountsFromDetails(initialMatch.match_players)
    ) as MatchFormMode;
  }
  if (createDefaults?.status === "loaded") return "loaded";
  if (createDefaults?.status === "scheduled") return "scheduled";
  return "scheduled";
}

function rosterCountsFromSets(
  convocados: Set<string>,
  teamA: Set<string>,
  teamB: Set<string>
): MatchRosterCounts {
  let assignedCount = 0;
  for (const id of convocados) {
    if (teamA.has(id) || teamB.has(id)) assignedCount += 1;
  }
  return { convocadoCount: convocados.size, assignedCount };
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
    created_at: "",
  };
}

export function MatchForm({ players, initialMatch, createDefaults }: Props) {
  const router = useRouter();
  const editId = initialMatch?.id;

  const mergedPlayers = useMemo(() => {
    const m = new Map(players.map((p) => [p.id, p]));
    initialMatch?.match_players.forEach((r) => {
      const g = ghostPlayerFromMatch(r);
      if (g && !m.has(g.id)) m.set(g.id, g);
    });
    return [...m.values()];
  }, [players, initialMatch]);

  const rosterActive = useMemo(
    () =>
      [...mergedPlayers]
        .filter((p) => p.active)
        .sort(comparePlayers),
    [mergedPlayers]
  );

  const byId = useMemo(() => new Map(mergedPlayers.map((p) => [p.id, p])), [mergedPlayers]);

  const [playedAt, setPlayedAt] = useState(
    initialMatch
      ? toDateInput(initialMatch.played_at)
      : (createDefaults?.playedAt ?? toDateInput(new Date().toISOString()))
  );
  const [notes, setNotes] = useState(initialMatch?.notes ?? createDefaults?.notes ?? "");
  const [matchMode, setMatchMode] = useState<MatchFormMode>(() =>
    initialMatchMode(initialMatch, createDefaults)
  );
  const [aScore, setAScore] = useState(initialMatch?.team_a_score ?? 0);
  const [bScore, setBScore] = useState(initialMatch?.team_b_score ?? 0);

  const [convocados, setConvocados] = useState<Set<string>>(() => {
    const s = new Set<string>();
    initialMatch?.match_players.forEach((r) => {
      if (r.players?.id && (r.team === "pool" || r.team === "A" || r.team === "B")) {
        s.add(r.players.id);
      }
    });
    return s;
  });

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

  const canPickMode = !initialMatch || initialMatch.status !== "played";
  const submitAsScheduled = canPickMode && matchMode === "scheduled";
  const submitAsLoaded = canPickMode && matchMode === "loaded";
  const submitAsTeams = canPickMode && matchMode === "teams";
  const submitAsPlayed = matchMode === "played";

  const inMatch = useMemo(() => new Set([...teamA, ...teamB]), [teamA, teamB]);

  const convocadosSorted = useMemo(() => {
    return [...convocados]
      .map((id) => byId.get(id))
      .filter((p): p is PlayerRow => p != null)
      .sort(comparePlayers);
  }, [convocados, byId]);

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

  const sinEquipoSorted = useMemo(
    () => convocadosSorted.filter((p) => !teamA.has(p.id) && !teamB.has(p.id)),
    [convocadosSorted, teamA, teamB]
  );

  const teamsEstablished = useMemo(() => {
    if (convocados.size === 0 || teamA.size === 0 || teamB.size === 0) return false;
    for (const id of convocados) {
      if (!teamA.has(id) && !teamB.has(id)) return false;
    }
    return true;
  }, [convocados, teamA, teamB]);

  const goalsSumA = useMemo(
    () => teamASorted.reduce((sum, p) => sum + (goals[p.id] ?? 0), 0),
    [teamASorted, goals]
  );
  const goalsSumB = useMemo(
    () => teamBSorted.reduce((sum, p) => sum + (goals[p.id] ?? 0), 0),
    [teamBSorted, goals]
  );

  useEffect(() => {
    if (!canPickMode || matchMode === "played") return;
    if (convocados.size === 0) {
      if (matchMode !== "scheduled") setMatchMode("scheduled");
      return;
    }
    if (teamsEstablished) {
      if (matchMode === "scheduled" || matchMode === "loaded") setMatchMode("teams");
    } else if (matchMode === "teams") {
      setMatchMode("loaded");
    } else if (matchMode === "scheduled") {
      setMatchMode("loaded");
    }
  }, [convocados.size, teamsEstablished, canPickMode, matchMode]);

  function toggleConvocado(playerId: string) {
    setConvocados((prev) => {
      const n = new Set(prev);
      if (n.has(playerId)) {
        n.delete(playerId);
        setTeamA((a) => {
          const na = new Set(a);
          na.delete(playerId);
          return na;
        });
        setTeamB((b) => {
          const nb = new Set(b);
          nb.delete(playerId);
          return nb;
        });
        setGoals((g) => {
          const next = { ...g };
          delete next[playerId];
          return next;
        });
      } else {
        n.add(playerId);
      }
      return n;
    });
  }

  function assignToTeam(playerId: string, team: "A" | "B") {
    if (!convocados.has(playerId)) return;
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

  function validateTeamsForSave(): string | null {
    if (convocados.size === 0) {
      return "Elegí al menos un convocado desde el plantel disponible.";
    }
    for (const id of convocados) {
      if (!teamA.has(id) && !teamB.has(id)) {
        return `Asigná cada convocado a ${teamDisplayName("A")} o ${teamDisplayName("B")}.`;
      }
    }
    for (const id of teamA) {
      if (!convocados.has(id)) {
        return `Hay jugadores en ${teamDisplayName("A")} que no están en la convocatoria.`;
      }
    }
    for (const id of teamB) {
      if (!convocados.has(id)) {
        return `Hay jugadores en ${teamDisplayName("B")} que no están en la convocatoria.`;
      }
    }
    if (teamA.size === 0 || teamB.size === 0) {
      return `Elegí al menos un jugador por equipo (${teamDisplayName("A")} y ${teamDisplayName("B")}).`;
    }
    const overlap = [...teamA].filter((id) => teamB.has(id));
    if (overlap.length) {
      return "Un jugador no puede estar en los dos equipos.";
    }
    return null;
  }

  async function writeTeamsLineups(matchId: string) {
    const db = getFirestoreDb();
    await deleteDocsWhere("match_players", "match_id", matchId);
    await deleteDocsWhere("match_goals", "match_id", matchId);
    const ops: { player_id: string; team: Team }[] = [];
    for (const player_id of [...teamA]) ops.push({ player_id, team: "A" });
    for (const player_id of [...teamB]) ops.push({ player_id, team: "B" });
    for (let i = 0; i < ops.length; i += 450) {
      const batch = writeBatch(db);
      const chunk = ops.slice(i, i + 450);
      for (const { player_id, team } of chunk) {
        const r = doc(collection(db, "match_players"));
        batch.set(r, { match_id: matchId, player_id, team });
      }
      await batch.commit();
    }
  }

  async function writePoolLineups(matchId: string) {
    const db = getFirestoreDb();
    await deleteDocsWhere("match_players", "match_id", matchId);
    const ids = [...convocados];
    if (ids.length === 0) return;
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(db);
      const chunk = ids.slice(i, i + 450);
      for (const player_id of chunk) {
        const r = doc(collection(db, "match_players"));
        batch.set(r, { match_id: matchId, player_id, team: "pool" });
      }
      await batch.commit();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (submitAsScheduled || submitAsLoaded) {
      if (submitAsLoaded && convocados.size === 0) {
        setError("En estado Cargado tenés que convocar al menos un jugador.");
        return;
      }
      const status: MatchStatus = resolveMatchStatus(
        submitAsLoaded ? "loaded" : "scheduled",
        rosterCountsFromSets(convocados, new Set(), new Set())
      );
      const d1Mode = status === "teams" ? "loaded" : status;
      setLoading(true);
      try {
        if (isD1Backend()) {
          await saveMatchD1({
            id: editId ?? null,
            mode: d1Mode,
            played_at: playedAt,
            notes: notes.trim() || null,
            pool: [...convocados],
          });
          router.push("/admin/partidos");
          router.refresh();
          return;
        }
        const db = getFirestoreDb();
        const notesVal = notes.trim() || null;
        let matchId = editId;
        if (editId) {
          await updateDoc(doc(db, "matches", editId), {
            played_at: playedAt,
            team_a_score: 0,
            team_b_score: 0,
            status,
            notes: notesVal,
          });
        } else {
          const ref = await addDoc(collection(db, "matches"), {
            played_at: playedAt,
            team_a_score: 0,
            team_b_score: 0,
            status,
            notes: notesVal,
            created_at: new Date().toISOString(),
          });
          matchId = ref.id;
        }
        if (matchId) await writePoolLineups(matchId);
        router.push("/admin/partidos");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (submitAsTeams) {
      const teamErr = validateTeamsForSave();
      if (teamErr) {
        setError(teamErr);
        return;
      }
      setLoading(true);
      try {
        if (isD1Backend()) {
          await saveMatchD1({
            id: editId ?? null,
            mode: "teams",
            played_at: playedAt,
            notes: notes.trim() || null,
            teams: { A: [...teamA], B: [...teamB] },
          });
          router.push("/admin/partidos");
          router.refresh();
          return;
        }
        const db = getFirestoreDb();
        const notesVal = notes.trim() || null;
        let matchId = editId;
        if (editId) {
          await updateDoc(doc(db, "matches", editId), {
            played_at: playedAt,
            team_a_score: 0,
            team_b_score: 0,
            status: "teams",
            notes: notesVal,
          });
        } else {
          const ref = await addDoc(collection(db, "matches"), {
            played_at: playedAt,
            team_a_score: 0,
            team_b_score: 0,
            status: "teams",
            notes: notesVal,
            created_at: new Date().toISOString(),
          });
          matchId = ref.id;
        }
        if (matchId) await writeTeamsLineups(matchId);
        router.push("/admin/partidos");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      } finally {
        setLoading(false);
      }
      return;
    }

    const teamErr = validateTeamsForSave();
    if (teamErr) {
      setError(teamErr);
      return;
    }

    setLoading(true);
    try {
      if (isD1Backend()) {
        await saveMatchD1({
          id: editId ?? null,
          mode: "played",
          played_at: playedAt,
          notes: notes.trim() || null,
          team_a_score: aScore,
          team_b_score: bScore,
          teams: { A: [...teamA], B: [...teamB] },
          goals,
        });
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

      router.push("/admin/partidos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-8">
      {canPickMode ? (
        <fieldset className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-2 p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted">Estado</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-2 has-[:checked]:border-accent/40 has-[:checked]:bg-accent/10">
            <input
              type="radio"
              name="match-mode"
              checked={matchMode === "scheduled"}
              onChange={() => setMatchMode("scheduled")}
              className="size-4 accent-accent"
            />
            <span className="text-sm font-medium">Programado</span>
            <span className="text-xs text-muted">(fecha y lugar; sin convocatoria obligatoria)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-2 has-[:checked]:border-accent/40 has-[:checked]:bg-accent/10">
            <input
              type="radio"
              name="match-mode"
              checked={matchMode === "loaded"}
              onChange={() => setMatchMode("loaded")}
              className="size-4 accent-accent"
            />
            <span className="text-sm font-medium">Cargado</span>
            <span className="text-xs text-muted">(convocatoria lista)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-2 has-[:checked]:border-accent/40 has-[:checked]:bg-accent/10">
            <input
              type="radio"
              name="match-mode"
              checked={matchMode === "teams"}
              onChange={() => setMatchMode("teams")}
              className="size-4 accent-accent"
            />
            <span className="text-sm font-medium">Equipos</span>
            <span className="text-xs text-muted">(Blanco y Negro antes del partido)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-2 has-[:checked]:border-accent/40 has-[:checked]:bg-accent/10">
            <input
              type="radio"
              name="match-mode"
              checked={matchMode === "played"}
              onChange={() => setMatchMode("played")}
              className="size-4 accent-accent"
            />
            <span className="text-sm font-medium">Finalizado</span>
            <span className="text-xs text-muted">(marcador y goles)</span>
          </label>
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Fecha</span>
          <input
            type="date"
            required
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 outline-none ring-accent/20 focus:ring-2"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Notas (horario, lugar…)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej. 22 h · Libero Futbol Lomas"
            className="mt-1 w-full resize-y rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none ring-accent/20 focus:ring-2"
          />
        </label>

        {submitAsPlayed ? (
          <>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">
                Goles {teamDisplayName("A")}
              </span>
              <input
                type="number"
                min={0}
                required
                value={aScore}
                onChange={(e) => setAScore(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 font-mono tabular-nums outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">
                Goles {teamDisplayName("B")}
              </span>
              <input
                type="number"
                min={0}
                required
                value={bScore}
                onChange={(e) => setBScore(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 font-mono tabular-nums outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
          </>
        ) : (
          <p className="sm:col-span-2 text-sm text-muted">
            El marcador se carga cuando el partido está en estado Finalizado.
          </p>
        )}
      </div>

      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/80"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Convocatoria del partido</p>
          <p className="text-sm text-fg">
            {convocados.size === 0
              ? "Tocá jugadores abajo para convocar"
              : convocados.size === 1
                ? "1 jugador convocado"
                : `${convocados.size} jugadores convocados`}
          </p>
        </div>
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-full text-xl font-black tabular-nums ${
            convocados.size > 0 ? "bg-accent text-canvas" : "border-2 border-dashed border-border text-muted"
          }`}
          aria-label={`${convocados.size} convocados`}
        >
          {convocados.size}
        </span>
      </div>

      <section className="rounded-2xl border border-border bg-surface-2 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">1 · Plantel disponible</h2>
          <span className="text-xs font-medium tabular-nums text-muted">
            {convocados.size} / {rosterActive.length} convocados
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Solo jugadores activos. Tocá para sumar o sacar de la convocatoria de este partido.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {rosterActive.map((p) => (
            <li key={`disp-${p.id}`}>
              <button
                type="button"
                onClick={() => toggleConvocado(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  convocados.has(p.id)
                    ? "border-accent/60 bg-accent/10"
                    : "border-border bg-surface hover:border-border"
                }`}
              >
                <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={40} />
                <span className="font-medium">{playerLabel(p)}</span>
                <span
                  className={`ml-auto text-xs font-semibold tabular-nums ${
                    convocados.has(p.id) ? "text-accent" : "text-muted"
                  }`}
                >
                  {convocados.has(p.id) ? "✓ Convocado" : "Sumar"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {submitAsTeams || submitAsPlayed ? (
        <>
          {convocadosSorted.length === 0 ? (
            <p className="text-sm text-muted">Primero armá la convocatoria para asignar Blanco y Negro.</p>
          ) : submitAsPlayed && teamsEstablished ? (
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted">3 · Goles por equipo</h2>
                <p className="mt-1 text-xs text-muted">
                  {teamDisplayName("A")} y {teamDisplayName("B")}. Tocá − o +; deberían sumar el marcador de arriba.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface-2 p-4">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{teamDisplayName("A")}</h3>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        goalsSumA === aScore ? "text-accent" : "text-amber-400"
                      }`}
                    >
                      {goalsSumA} / {aScore} goles
                    </span>
                  </div>
                  {goalsSumA !== aScore ? (
                    <p className="mb-3 text-xs text-amber-400/90">
                      Faltan o sobran goles respecto al marcador de {teamDisplayName("A")}.
                    </p>
                  ) : null}
                  <ul className="flex flex-col gap-2">
                    {teamASorted.map((p) => {
                      const n = goals[p.id] ?? 0;
                      return (
                        <li
                          key={`ga-${p.id}`}
                          className={`rounded-xl border px-3 py-2.5 ${
                            n > 0 ? "border-accent/40 bg-accent/5" : "border-border bg-surface"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={36} />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{playerLabel(p)}</span>
                            <button
                              type="button"
                              onClick={() => assignToTeam(p.id, "B")}
                              className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted hover:text-fg"
                            >
                              → {teamDisplayName("B")}
                            </button>
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
                            <span className="min-w-[2.5rem] text-center text-lg font-black tabular-nums text-accent">
                              {n}
                            </span>
                            <button
                              type="button"
                              aria-label={`Más goles de ${playerLabel(p)}`}
                              onClick={() => adjustGoal(p.id, 1)}
                              className="flex size-11 items-center justify-center rounded-xl border border-accent/50 bg-accent/15 text-xl font-bold text-accent transition hover:bg-accent/25"
                            >
                              +
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-2xl border border-border bg-surface-2 p-4">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{teamDisplayName("B")}</h3>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        goalsSumB === bScore ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {goalsSumB} / {bScore} goles
                    </span>
                  </div>
                  {goalsSumB !== bScore ? (
                    <p className="mb-3 text-xs text-amber-400/90">
                      Faltan o sobran goles respecto al marcador de {teamDisplayName("B")}.
                    </p>
                  ) : null}
                  <ul className="flex flex-col gap-2">
                    {teamBSorted.map((p) => {
                      const n = goals[p.id] ?? 0;
                      return (
                        <li
                          key={`gb-${p.id}`}
                          className={`rounded-xl border px-3 py-2.5 ${
                            n > 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-surface"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={36} />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{playerLabel(p)}</span>
                            <button
                              type="button"
                              onClick={() => assignToTeam(p.id, "A")}
                              className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted hover:text-fg"
                            >
                              → {teamDisplayName("A")}
                            </button>
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
                            <span className="min-w-[2.5rem] text-center text-lg font-black tabular-nums text-emerald-400">
                              {n}
                            </span>
                            <button
                              type="button"
                              aria-label={`Más goles de ${playerLabel(p)}`}
                              onClick={() => adjustGoal(p.id, 1)}
                              className="flex size-11 items-center justify-center rounded-xl border border-emerald-500/50 bg-emerald-500/15 text-xl font-bold text-emerald-400 transition hover:bg-emerald-500/25"
                            >
                              +
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
                  {submitAsTeams ? "2 · Blanco y Negro" : "3 · Blanco y Negro"}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Asigná cada convocado a {teamDisplayName("A")} o {teamDisplayName("B")}. Los equipos cambian en cada
                  fecha.
                </p>
                <p className="mt-2 text-xs font-medium tabular-nums text-muted">
                  {teamDisplayName("A")}: {teamA.size} · {teamDisplayName("B")}: {teamB.size} · sin equipo:{" "}
                  {sinEquipoSorted.length}
                </p>
              </div>

              {sinEquipoSorted.length > 0 ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-amber-400">
                    Sin equipo ({sinEquipoSorted.length})
                  </h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {sinEquipoSorted.map((p) => (
                      <li
                        key={`ne-${p.id}`}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2"
                      >
                        <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={36} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{playerLabel(p)}</span>
                        <button
                          type="button"
                          onClick={() => assignToTeam(p.id, "A")}
                          className="min-h-[40px] rounded-lg border border-accent/50 bg-accent/15 px-4 text-sm font-bold text-accent"
                        >
                          {teamDisplayName("A")}
                        </button>
                        <button
                          type="button"
                          onClick={() => assignToTeam(p.id, "B")}
                          className="min-h-[40px] rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-4 text-sm font-bold text-emerald-400"
                        >
                          {teamDisplayName("B")}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface-2 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    {teamDisplayName("A")} ({teamA.size})
                  </h3>
                  {teamASorted.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">Vacío</p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-2">
                      {teamASorted.map((p) => (
                        <li
                          key={`ta-${p.id}`}
                          className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2"
                        >
                          <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={32} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{playerLabel(p)}</span>
                          <button
                            type="button"
                            onClick={() => removeFromTeam(p.id)}
                            className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-muted hover:bg-surface"
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-surface-2 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    {teamDisplayName("B")} ({teamB.size})
                  </h3>
                  {teamBSorted.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">Vacío</p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-2">
                      {teamBSorted.map((p) => (
                        <li
                          key={`tb-${p.id}`}
                          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2"
                        >
                          <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={32} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{playerLabel(p)}</span>
                          <button
                            type="button"
                            onClick={() => removeFromTeam(p.id)}
                            className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-muted hover:bg-surface"
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
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
            ? convocados.size > 0
              ? `Guardar cambios · ${convocados.size} convocados`
              : "Guardar cambios"
            : submitAsScheduled
              ? "Crear partido programado"
              : submitAsLoaded
                ? convocados.size > 0
                  ? `Guardar cargado · ${convocados.size} convocados`
                  : "Guardar partido cargado"
                : submitAsTeams
                  ? teamsEstablished
                    ? `Guardar equipos · ${convocados.size} jugadores`
                    : "Guardar equipos"
                  : convocados.size > 0
                    ? `Crear partido finalizado · ${convocados.size} convocados`
                    : "Crear partido finalizado"}
      </button>
    </form>
  );
}
