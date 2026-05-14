"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChampionHistoria2025 } from "@/components/ChampionHistoria2025";
import { NextMatchTeamDraft } from "@/components/NextMatchTeamDraft";
import { SetupBanner } from "@/components/SetupBanner";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { canUsePublicApp, isFirebaseConfigured } from "@/lib/env";
import { firebaseErrorUserHint } from "@/lib/firebase/client";
import {
  fetchConfirmations,
  fetchMatchGoals,
  fetchMatchLineups,
  fetchMatches,
  fetchPlayers,
} from "@/lib/firestore-queries";
import { formatMatchDayShort, pickLastPlayedMatch, pickNextScheduledMatch } from "@/lib/next-match";
import { computeStandings } from "@/lib/scoring";
import type { MatchPlayerRow, MatchRow, PlayerRow } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function HomePage() {
  const [standings, setStandings] = useState<ReturnType<typeof computeStandings>>([]);
  const [recent, setRecent] = useState<MatchRow[]>([]);
  const [lastPlayed, setLastPlayed] = useState<MatchRow | null>(null);
  const [nextMatch, setNextMatch] = useState<MatchRow | null>(null);
  const [playersList, setPlayersList] = useState<PlayerRow[]>([]);
  const [lineupsList, setLineupsList] = useState<MatchPlayerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(canUsePublicApp);

  useEffect(() => {
    if (!canUsePublicApp()) return;
    let cancelled = false;
    void (async () => {
      try {
        const [players, matches, lineups, goals, confirmations] = await Promise.all([
          fetchPlayers(true),
          fetchMatches(),
          fetchMatchLineups(),
          fetchMatchGoals(),
          fetchConfirmations(),
        ]);
        if (cancelled) return;
        setPlayersList(players);
        setLineupsList(lineups);
        setStandings(computeStandings(players, matches, lineups, goals, confirmations));
        setRecent(matches.filter((m) => m.status === "played").slice(0, 3));
        setLastPlayed(pickLastPlayedMatch(matches));
        setNextMatch(pickNextScheduledMatch(matches));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar datos");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const empty = useMemo(
    () => !loading && standings.length === 0 && !error,
    [loading, standings.length, error]
  );

  const mosc = useMemo(() => {
    return standings.find((r) => r.player.display_name.trim().toLowerCase() === "rodrigo coll");
  }, [standings]);

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-6">
        <header className="text-center">
          <p className="mt-1 text-muted">Torneo del jueves</p>
        </header>
        <SetupBanner />
      </div>
    );
  }

  if (loading) {
    return <p className="text-center text-muted">Cargando tabla…</p>;
  }

  if (error) {
    const hint = firebaseErrorUserHint(error);
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span className="font-medium">Error:</span> {error}
          {hint ? (
            <>
              <br />
              <span className="mt-2 block text-red-100/90">{hint}</span>
            </>
          ) : (
            <span className="mt-2 block text-red-100/80">
              Revisá reglas de Firestore, variables NEXT_PUBLIC_FIREBASE_* y restricciones de la API key en Google Cloud.
            </span>
          )}
        </p>
        {isFirebaseConfigured() ? (
          <p className="text-sm text-muted">
            {error.toLowerCase().includes("firebasestorage.app") ? (
              <>
                Las variables Firebase ya están cargadas. Este fallo viene del{" "}
                <strong>proyecto en Google</strong> (recurso del bucket por defecto), no de reglas de
                Firestore ni de un .env mal pegado.
              </>
            ) : (
              <>
                Las variables Firebase ya están cargadas; si el error no menciona Storage, revisá
                reglas y la <strong>clave API</strong> en Google Cloud.
              </>
            )}
          </p>
        ) : (
          <SetupBanner />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-h-0 flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Último partido</h2>
          {lastPlayed ? (
            <Link
              href={`/partidos/${lastPlayed.id}`}
              className="flex h-full min-h-[5.5rem] items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-surface px-4 py-4 shadow-[var(--shadow-glow)] transition hover:border-accent/50 hover:bg-surface-2"
            >
              <ChevronLeft className="h-5 w-5 shrink-0 text-accent" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold tracking-tight">{formatMatchDayShort(lastPlayed.played_at)}</p>
                {lastPlayed.notes ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{lastPlayed.notes}</p>
                ) : null}
              </div>
            </Link>
          ) : (
            <div className="flex min-h-[5.5rem] items-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
              Todavía no hay partidos jugados.
            </div>
          )}
        </div>
        <div className="flex min-h-0 flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Próximo partido</h2>
          {nextMatch ? (
            <div className="flex min-h-0 flex-col gap-2">
              <Link
                href={`/partidos/${nextMatch.id}`}
                className="flex h-full min-h-[5.5rem] items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-surface px-4 py-4 shadow-[var(--shadow-glow)] transition hover:border-accent/50 hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold tracking-tight">{formatMatchDayShort(nextMatch.played_at)}</p>
                  {nextMatch.notes ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted">{nextMatch.notes}</p>
                  ) : null}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-accent" aria-hidden />
              </Link>
              <NextMatchTeamDraft
                nextMatch={nextMatch}
                lineups={lineupsList}
                players={playersList}
                standings={standings}
              />
            </div>
          ) : (
            <div className="flex min-h-[5.5rem] items-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
              No hay partidos programados.
            </div>
          )}
        </div>
      </section>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Tabla general</h1>
      </header>

      <section>
        {empty ? (
          <p className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-muted">
            Todavía no hay partidos cargados.
          </p>
        ) : (
          <div className="rounded-2xl border border-border bg-surface shadow-sm">
            <table className="w-full table-fixed border-collapse text-[0.7rem] leading-tight sm:text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[0.6rem] font-bold uppercase tracking-wide text-muted sm:text-[0.65rem]">
                  <th className="w-7 px-0.5 py-2 text-center sm:w-8">#</th>
                  <th className="min-w-0 px-1 py-2 text-left">Jugador</th>
                  <th className="w-7 px-0 py-2 text-center sm:w-8">PJ</th>
                  <th className="w-7 px-0 py-2 text-center sm:w-8">PG</th>
                  <th className="w-7 px-0 py-2 text-center sm:w-8">PE</th>
                  <th className="w-7 px-0 py-2 text-center sm:w-8">PP</th>
                  <th className="w-7 px-0 py-2 text-center sm:w-8">G</th>
                  <th className="w-7 px-0 py-2 text-center sm:w-8">B</th>
                  <th className="w-8 px-0.5 py-2 pr-1 text-center text-accent sm:w-9">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => (
                  <tr
                    key={row.player.id}
                    className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-2/60"
                  >
                    <td className="px-0.5 py-1.5 text-center align-middle tabular-nums text-muted sm:py-2">
                      {i + 1}
                    </td>
                    <td className="min-w-0 px-1 py-1.5 align-middle sm:py-2">
                      <Link
                        href={`/jugadores/${row.player.id}`}
                        className="flex min-w-0 items-center gap-1.5 active:opacity-90 sm:gap-2"
                      >
                        <PlayerAvatar
                          name={row.player.display_name}
                          url={row.player.avatar_url}
                          size={28}
                        />
                        <span className="min-w-0 truncate font-medium sm:font-semibold">
                          {row.player.display_name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-0 py-1.5 text-center align-middle tabular-nums text-muted sm:py-2">
                      {row.played}
                    </td>
                    <td className="px-0 py-1.5 text-center align-middle tabular-nums sm:py-2">{row.wins}</td>
                    <td className="px-0 py-1.5 text-center align-middle tabular-nums sm:py-2">{row.draws}</td>
                    <td className="px-0 py-1.5 text-center align-middle tabular-nums sm:py-2">{row.losses}</td>
                    <td className="px-0 py-1.5 text-center align-middle tabular-nums sm:py-2">{row.goals}</td>
                    <td className="px-0 py-1.5 text-center align-middle tabular-nums sm:py-2">{row.bonus}</td>
                    <td className="px-0.5 py-1.5 pr-1 text-center align-middle text-sm font-black tabular-nums text-accent sm:py-2 sm:text-base">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ChampionHistoria2025
        championPlayerHref={mosc ? `/jugadores/${mosc.player.id}` : undefined}
        championAvatarUrl={mosc?.player.avatar_url ?? null}
      />

      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Últimos partidos</h2>
            <Link href="/partidos" className="text-sm font-medium text-accent">
              Ver todos
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {recent.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/partidos/${m.id}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm transition hover:border-accent/30"
                >
                  <span className="text-muted">
                    {new Date(m.played_at + "T12:00:00").toLocaleDateString("es", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="font-mono font-bold tabular-nums">
                    {m.team_a_score} — {m.team_b_score}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
