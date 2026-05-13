"use client";

import { useMemo, useState } from "react";
import { addDoc, collection, doc, updateDoc, writeBatch } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { getFirestoreDb } from "@/lib/firebase/client";
import { deleteDocsWhere } from "@/lib/firestore-queries";
import type { MatchWithDetails, PlayerRow } from "@/lib/types";

export type MatchFormCreateDefaults = {
  playedAt: string;
  notes: string;
  scheduled: boolean;
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
        .sort((a, b) => a.display_name.localeCompare(b.display_name)),
    [mergedPlayers]
  );

  const byId = useMemo(() => new Map(mergedPlayers.map((p) => [p.id, p])), [mergedPlayers]);

  const [playedAt, setPlayedAt] = useState(
    initialMatch
      ? toDateInput(initialMatch.played_at)
      : (createDefaults?.playedAt ?? toDateInput(new Date().toISOString()))
  );
  const [notes, setNotes] = useState(initialMatch?.notes ?? createDefaults?.notes ?? "");
  const [isScheduled, setIsScheduled] = useState(
    () => initialMatch?.status === "scheduled" || Boolean(createDefaults?.scheduled)
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

  const canPickMode = !initialMatch || initialMatch.status === "scheduled";
  const submitAsScheduled = canPickMode && isScheduled;

  const inMatch = useMemo(() => new Set([...teamA, ...teamB]), [teamA, teamB]);

  const convocadosSorted = useMemo(() => {
    return [...convocados]
      .map((id) => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => a!.display_name.localeCompare(b!.display_name)) as PlayerRow[];
  }, [convocados, byId]);

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
      } else {
        n.add(playerId);
      }
      return n;
    });
  }

  function toggleTeam(playerId: string, team: "A" | "B") {
    if (!convocados.has(playerId)) return;
    if (team === "A") {
      setTeamB((b) => {
        const n = new Set(b);
        n.delete(playerId);
        return n;
      });
      setTeamA((a) => {
        const n = new Set(a);
        if (n.has(playerId)) n.delete(playerId);
        else n.add(playerId);
        return n;
      });
    } else {
      setTeamA((a) => {
        const n = new Set(a);
        n.delete(playerId);
        return n;
      });
      setTeamB((b) => {
        const n = new Set(b);
        if (n.has(playerId)) n.delete(playerId);
        else n.add(playerId);
        return n;
      });
    }
  }

  function setGoal(playerId: string, n: number) {
    setGoals((g) => {
      const next = { ...g };
      if (n <= 0) delete next[playerId];
      else next[playerId] = n;
      return next;
    });
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

    if (submitAsScheduled) {
      setLoading(true);
      try {
        const db = getFirestoreDb();
        const notesVal = notes.trim() || null;
        let matchId = editId;
        if (editId) {
          await updateDoc(doc(db, "matches", editId), {
            played_at: playedAt,
            team_a_score: 0,
            team_b_score: 0,
            status: "scheduled",
            notes: notesVal,
          });
        } else {
          const ref = await addDoc(collection(db, "matches"), {
            played_at: playedAt,
            team_a_score: 0,
            team_b_score: 0,
            status: "scheduled",
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

    if (convocados.size === 0) {
      setError("Elegí al menos un convocado desde el plantel disponible.");
      return;
    }
    for (const id of convocados) {
      if (!teamA.has(id) && !teamB.has(id)) {
        setError("Asigná cada convocado a equipo A o equipo B.");
        return;
      }
    }
    for (const id of teamA) {
      if (!convocados.has(id)) {
        setError("Hay jugadores en equipo A que no están en la convocatoria.");
        return;
      }
    }
    for (const id of teamB) {
      if (!convocados.has(id)) {
        setError("Hay jugadores en equipo B que no están en la convocatoria.");
        return;
      }
    }
    if (teamA.size === 0 || teamB.size === 0) {
      setError("Elegí al menos un jugador por equipo (solo entre convocados).");
      return;
    }
    const overlap = [...teamA].filter((id) => teamB.has(id));
    if (overlap.length) {
      setError("Un jugador no puede estar en los dos equipos.");
      return;
    }

    setLoading(true);
    try {
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
              checked={isScheduled}
              onChange={() => setIsScheduled(true)}
              className="size-4 accent-accent"
            />
            <span className="text-sm font-medium">Programado</span>
            <span className="text-xs text-muted">(convocatoria; equipos después)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-2 has-[:checked]:border-accent/40 has-[:checked]:bg-accent/10">
            <input
              type="radio"
              name="match-mode"
              checked={!isScheduled}
              onChange={() => setIsScheduled(false)}
              className="size-4 accent-accent"
            />
            <span className="text-sm font-medium">Ya jugado</span>
            <span className="text-xs text-muted">(convocados → equipos → resultado)</span>
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

        {!submitAsScheduled ? (
          <>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">Goles equipo A</span>
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
              <span className="text-xs font-bold uppercase tracking-wide text-muted">Goles equipo B</span>
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
            Marcador 0 — 0 hasta que cargues el resultado al editar el partido.
          </p>
        )}
      </div>

      <section className="rounded-2xl border border-border bg-surface-2 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">1 · Plantel disponible</h2>
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
                <PlayerAvatar name={p.display_name} url={p.avatar_url} size={40} />
                <span className="font-medium">{p.display_name}</span>
                <span className="ml-auto text-xs text-muted">{convocados.has(p.id) ? "Convocado" : "Disponible"}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-surface-2 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">2 · Convocados</h2>
        <p className="mt-1 text-xs text-muted">
          {submitAsScheduled
            ? "Se guardan como convocatoria del partido (aún sin equipos)."
            : "Después asignás cada uno a equipo A o B abajo."}
        </p>
        {convocadosSorted.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Todavía no hay nadie convocado.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {convocadosSorted.map((p) => (
              <li key={`conv-${p.id}`} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                <PlayerAvatar name={p.display_name} url={p.avatar_url} size={36} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.display_name}</span>
                <button
                  type="button"
                  onClick={() => toggleConvocado(p.id)}
                  className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs font-medium text-muted hover:bg-surface-2"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!submitAsScheduled ? (
        <>
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">3 · Equipo A (solo convocados)</h2>
            {convocadosSorted.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Primero armá la convocatoria.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {convocadosSorted.map((p) => (
                  <li key={`a-${p.id}`}>
                    <button
                      type="button"
                      onClick={() => toggleTeam(p.id, "A")}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        teamA.has(p.id)
                          ? "border-accent/60 bg-accent/10"
                          : "border-border bg-surface-2 hover:border-border"
                      }`}
                    >
                      <PlayerAvatar name={p.display_name} url={p.avatar_url} size={40} />
                      <span className="font-medium">{p.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">3 · Equipo B (solo convocados)</h2>
            {convocadosSorted.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Primero armá la convocatoria.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {convocadosSorted.map((p) => (
                  <li key={`b-${p.id}`}>
                    <button
                      type="button"
                      onClick={() => toggleTeam(p.id, "B")}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        teamB.has(p.id)
                          ? "border-accent/60 bg-accent/10"
                          : "border-border bg-surface-2 hover:border-border"
                      }`}
                    >
                      <PlayerAvatar name={p.display_name} url={p.avatar_url} size={40} />
                      <span className="font-medium">{p.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {inMatch.size > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Goles por jugador</h2>
              <p className="mt-1 text-xs text-muted">Solo jugadores en cancha. Dejá en 0 si no metió.</p>
              <ul className="mt-3 flex flex-col gap-2">
                {[...inMatch].map((id) => {
                  const p = byId.get(id);
                  if (!p) return null;
                  return (
                    <li key={`g-${id}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2">
                      <PlayerAvatar name={p.display_name} url={p.avatar_url} size={36} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.display_name}</span>
                      <input
                        type="number"
                        min={0}
                        value={goals[id] ?? 0}
                        onChange={(e) => setGoal(id, Number(e.target.value))}
                        className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-center font-mono text-sm tabular-nums"
                      />
                    </li>
                  );
                })}
              </ul>
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
        {loading ? "Guardando…" : editId ? "Guardar cambios" : submitAsScheduled ? "Crear partido programado" : "Crear partido"}
      </button>
    </form>
  );
}
