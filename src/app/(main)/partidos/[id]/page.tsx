"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FinishedMatchBoard } from "@/components/FinishedMatchBoard";
import { MatchTeamDraftAdminSection } from "@/components/MatchTeamDraftAdminSection";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { GoalBallIcons } from "@/components/GoalBallIcons";
import { SetupBanner } from "@/components/SetupBanner";
import { canUsePublicApp } from "@/lib/env";
import { fetchMatchById } from "@/lib/firestore-queries";
import { displayMatchScores } from "@/lib/match-outcome";
import { matchStatusLabel, showsMatchScore, showsMatchTeams } from "@/lib/match-status";
import { comparePlayers, playerLabel } from "@/lib/player-label";
import { teamDisplayName } from "@/lib/team-labels";
import type { MatchWithDetails } from "@/lib/types";

function playersFromRoster(
  rows: MatchWithDetails["match_players"],
  team: "A" | "B"
) {
  return rows
    .filter((r) => r.team === team && r.players)
    .map((r) => r.players!);
}

export default function PartidoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [match, setMatch] = useState<MatchWithDetails | null | undefined>(undefined);

  useEffect(() => {
    if (!canUsePublicApp() || !id) return;
    void fetchMatchById(id).then(setMatch);
  }, [id]);

  const goalsByPlayer = useMemo(() => {
    const m = new Map<string, number>();
    if (!match) return m;
    for (const g of match.match_goals) {
      m.set(g.player_id, (m.get(g.player_id) ?? 0) + g.goals);
    }
    return m;
  }, [match]);

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Partido</h1>
        <SetupBanner />
      </div>
    );
  }

  if (!id) {
    return <p className="text-muted">Enlace inválido.</p>;
  }

  if (match === undefined) {
    return <p className="text-muted">Cargando…</p>;
  }

  if (!match) {
    return <p className="text-muted">Partido no encontrado.</p>;
  }

  const teamAPlayers = playersFromRoster(match.match_players, "A");
  const teamBPlayers = playersFromRoster(match.match_players, "B");
  const isFinalized = showsMatchScore(match.status);

  const convocadosSorted = (() => {
    const seen = new Set<string>();
    const list: NonNullable<(typeof match.match_players)[0]["players"]>[] = [];
    for (const r of match.match_players) {
      if (!r.players || seen.has(r.players.id)) continue;
      if (r.team === "pool" || r.team === "A" || r.team === "B") {
        seen.add(r.players.id);
        list.push(r.players);
      }
    }
    list.sort(comparePlayers);
    return list;
  })();

  const dateLabel = new Date(match.played_at + "T12:00:00").toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const { scoreA: displayA, scoreB: displayB } = displayMatchScores(match);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/partidos" className="text-sm font-medium text-accent hover:underline">
        ← Partidos
      </Link>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          {isFinalized ? "Partido finalizado" : "Partido"}
        </p>
        <h1 className="text-xl font-bold capitalize tracking-tight sm:text-2xl">{dateLabel}</h1>
        {match.notes ? <p className="text-sm text-muted">{match.notes}</p> : null}
      </header>

      {isFinalized ? (
        <>
          <FinishedMatchBoard
            scoreA={displayA}
            scoreB={displayB}
            teamA={teamAPlayers}
            teamB={teamBPlayers}
            goalsByPlayer={goalsByPlayer}
          />

          <section className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Jugadores convocados</h2>
              {convocadosSorted.length > 0 ? (
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold tabular-nums text-accent">
                  {convocadosSorted.length}
                </span>
              ) : null}
            </div>
            {convocadosSorted.length === 0 ? (
              <p className="text-sm text-muted">Sin convocatoria cargada.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {convocadosSorted.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/jugadores/${p.id}`}
                      className="flex items-center gap-2 rounded-xl py-1.5 transition hover:bg-surface-2"
                    >
                      <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={40} />
                      <span className="min-w-0 flex-1 truncate font-medium">{playerLabel(p)}</span>
                      <GoalBallIcons count={goalsByPlayer.get(p.id) ?? 0} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="rounded-3xl border border-border bg-gradient-to-br from-surface to-surface-2 px-6 py-8 text-center shadow-[var(--shadow-glow)]">
            <p className="text-3xl font-black text-accent">{matchStatusLabel(match.status)}</p>
          </div>

          {showsMatchTeams(match.status) && (teamAPlayers.length > 0 || teamBPlayers.length > 0) ? (
            <section className="grid gap-4 sm:grid-cols-2">
              {(["A", "B"] as const).map((side) => {
                const players = side === "A" ? teamAPlayers : teamBPlayers;
                return (
                  <div
                    key={side}
                    className={`rounded-2xl border p-4 ${
                      side === "A"
                        ? "border-accent/25 bg-accent/5"
                        : "border-emerald-500/25 bg-emerald-500/5"
                    }`}
                  >
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
                      {teamDisplayName(side)}
                    </h2>
                    {players.length === 0 ? (
                      <p className="text-sm text-muted">Sin jugadores asignados.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {[...players]
                          .sort(comparePlayers)
                          .map((p) => (
                            <li key={p.id}>
                              <Link
                                href={`/jugadores/${p.id}`}
                                className="flex items-center gap-2 rounded-lg py-1.5 transition hover:bg-surface-2/80"
                              >
                                <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={36} />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                  {playerLabel(p)}
                                </span>
                                <GoalBallIcons count={goalsByPlayer.get(p.id) ?? 0} />
                              </Link>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Jugadores convocados</h2>
              {convocadosSorted.length > 0 ? (
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold tabular-nums text-accent">
                  {convocadosSorted.length}
                </span>
              ) : null}
            </div>
            {convocadosSorted.length === 0 ? (
              <p className="text-sm text-muted">Sin convocatoria cargada todavía.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {convocadosSorted.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/jugadores/${p.id}`}
                      className="flex items-center gap-2 rounded-xl py-1.5 transition hover:bg-surface-2"
                    >
                      <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={40} />
                      <span className="min-w-0 flex-1 truncate font-medium">{playerLabel(p)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <MatchTeamDraftAdminSection match={match} />
    </div>
  );
}
