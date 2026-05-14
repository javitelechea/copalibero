"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  alternatingTeamsFromOrdered,
  poolPlayerIdsForMatch,
  sortPlayersForTeamDraft,
  type DraftRosterSlot,
} from "@/lib/draft-teams";
import type { StandingRow } from "@/lib/scoring";
import type { MatchPlayerRow, MatchRow, PlayerRow } from "@/lib/types";
import { Users } from "lucide-react";

type Props = {
  nextMatch: MatchRow;
  lineups: MatchPlayerRow[];
  players: PlayerRow[];
  standings: StandingRow[];
  /** Sin borde propio ni fondo duplicado cuando va dentro de otra tarjeta. */
  embedded?: boolean;
};

export function NextMatchTeamDraft({ nextMatch, lineups, players, standings, embedded = false }: Props) {
  const poolIds = useMemo(
    () => poolPlayerIdsForMatch(lineups, nextMatch.id),
    [lineups, nextMatch.id]
  );

  const poolPlayers = useMemo(() => {
    const set = new Set(poolIds);
    return players.filter((p) => set.has(p.id));
  }, [players, poolIds]);

  const sortedPool = useMemo(
    () => sortPlayersForTeamDraft(poolPlayers, standings),
    [poolPlayers, standings]
  );

  const [teamById, setTeamById] = useState<Record<string, DraftRosterSlot>>({});
  const [manual, setManual] = useState(false);

  const poolKey = useMemo(() => [...poolIds].sort().join("|"), [poolIds]);

  const applyTableInterleave = useCallback(() => {
    const ab = alternatingTeamsFromOrdered(sortedPool);
    const next: Record<string, DraftRosterSlot> = {};
    for (const p of sortedPool) {
      next[p.id] = ab[p.id] ?? "A";
    }
    setTeamById(next);
  }, [sortedPool]);

  useEffect(() => {
    setManual(false);
    if (poolIds.length === 0) {
      setTeamById({});
      return;
    }
    applyTableInterleave();
  }, [poolKey, nextMatch.id, poolIds.length, applyTableInterleave]);

  const teamA = useMemo(
    () => sortedPool.filter((p) => teamById[p.id] === "A"),
    [sortedPool, teamById]
  );
  const teamB = useMemo(
    () => sortedPool.filter((p) => teamById[p.id] === "B"),
    [sortedPool, teamById]
  );
  const unassigned = useMemo(
    () => sortedPool.filter((p) => teamById[p.id] === "pool"),
    [sortedPool, teamById]
  );

  if (nextMatch.status !== "scheduled") return null;

  function cycleTeam(playerId: string) {
    setManual(true);
    setTeamById((prev) => {
      const cur = prev[playerId] ?? "pool";
      const order: DraftRosterSlot[] = ["pool", "A", "B"];
      const i = order.indexOf(cur);
      const next = order[(i + 1) % order.length];
      return { ...prev, [playerId]: next };
    });
  }

  const shell = embedded ? "text-sm text-muted" : "rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted shadow-sm";

  if (poolIds.length === 0) {
    return (
      <div className={embedded ? "pt-1 text-sm text-muted" : shell}>
        <div className="flex items-center gap-2 font-medium text-fg">
          <Users className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          Armar equipos
        </div>
        <p className="mt-1.5">
          No hay convocados en <span className="text-fg/90">pool</span> para este partido. Sumalos desde{" "}
          <Link href={`/partidos/${nextMatch.id}`} className="text-accent underline-offset-2 hover:underline">
            el partido
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? "pt-1" : "rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-fg">
          <Users className="h-4 w-4 text-accent" aria-hidden />
          Armar equipos
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setManual(false);
              applyTableInterleave();
            }}
            className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20"
          >
            Por tabla (intercalado)
          </button>
          <button
            type="button"
            onClick={() => setManual(true)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              manual
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted hover:border-accent/40 hover:text-fg"
            }`}
          >
            Manual
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        Borrador orientativo: el orden sigue puntos / goles / victorias de la tabla; si empatan, cuenta la
        prioridad que cargue el admin en el jugador. Para confirmar equipos reales usá el panel del partido.
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {sortedPool.map((p) => {
          const slot = teamById[p.id] ?? "pool";
          return (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-xl border border-border/80 bg-surface-2/50 px-2 py-1.5"
            >
              <PlayerAvatar name={p.display_name} url={p.avatar_url} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.display_name}</span>
              <button
                type="button"
                onClick={() => cycleTeam(p.id)}
                className="shrink-0 rounded-lg border border-border px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-muted hover:border-accent/50 hover:text-fg"
                aria-label={`Equipo para ${p.display_name}: ${slot}`}
              >
                {slot === "pool" ? "—" : slot}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-accent/25 bg-accent/5 px-2 py-2">
          <p className="font-bold text-accent">Equipo A ({teamA.length})</p>
          <p className="mt-1 line-clamp-4 text-muted">{teamA.map((p) => p.display_name).join(", ") || "—"}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-2 py-2">
          <p className="font-bold text-emerald-400">Equipo B ({teamB.length})</p>
          <p className="mt-1 line-clamp-4 text-muted">{teamB.map((p) => p.display_name).join(", ") || "—"}</p>
        </div>
      </div>

      {unassigned.length > 0 ? (
        <p className="mt-2 text-xs text-muted">
          Sin equipo: {unassigned.map((p) => p.display_name).join(", ")}. Tocá la letra para asignar.
        </p>
      ) : null}
    </div>
  );
}
