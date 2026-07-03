"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SetupBanner } from "@/components/SetupBanner";
import { canUsePublicApp } from "@/lib/env";
import { fetchMatchLineups, fetchMatches, fetchPlayers } from "@/lib/firestore-queries";
import { playerLabel } from "@/lib/player-label";
import {
  computePairwiseDuels,
  groupDuelsByPadre,
  type PadreGroup,
} from "@/lib/pairwise-duels";
import { Crown, Trophy } from "lucide-react";

const MIN_MARGIN = 3;

function PadreCard({ group, rank }: { group: PadreGroup; rank: number }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-col sm:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-2 border-b border-border bg-surface-2 px-4 py-4 sm:w-36 sm:border-b-0 sm:border-r md:w-40">
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">Padre #{rank}</span>
          <Link href={`/jugadores/${group.padre.id}`} className="flex flex-col items-center gap-2 text-center">
            <PlayerAvatar name={playerLabel(group.padre)} url={group.padre.avatar_url} size={52} />
            <span className="line-clamp-3 text-sm font-bold leading-tight text-accent">
              {playerLabel(group.padre)}
            </span>
          </Link>
          <p className="text-center text-[0.65rem] font-medium text-muted">
            {group.hijos.length} {group.hijos.length === 1 ? "hijo" : "hijos"}
          </p>
        </div>

        <div className="min-w-0 flex-1 p-1 sm:p-3">
          <table className="w-full table-fixed border-collapse text-[clamp(0.625rem,2.5vw,0.875rem)] leading-tight sm:text-sm">
            <colgroup>
              <col style={{ width: "46%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "36%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-[0.58rem] font-bold uppercase tracking-wide text-muted sm:text-xs">
                <th className="px-2 py-1.5 sm:px-3 sm:py-2">Hijo</th>
                <th className="px-1 py-1.5 text-center sm:py-2">+Pts</th>
                <th className="px-2 py-1.5 text-center sm:py-2">Marcador</th>
              </tr>
            </thead>
            <tbody>
              {group.hijos.map((h) => (
                <tr key={h.hijo.id} className="border-b border-border/70 last:border-b-0">
                  <td className="px-2 py-2 sm:px-3">
                    <Link href={`/jugadores/${h.hijo.id}`} className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      <PlayerAvatar
                        name={playerLabel(h.hijo)}
                        url={h.hijo.avatar_url}
                        size={24}
                        className="text-[9px] sm:text-xs"
                      />
                      <span className="min-w-0 truncate font-medium text-fg">{playerLabel(h.hijo)}</span>
                    </Link>
                  </td>
                  <td className="px-1 py-2 text-center font-black tabular-nums text-accent">+{h.margin}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-muted">
                    <span className="font-semibold text-fg">{h.padreWins}</span>
                    <span className="mx-0.5">–</span>
                    <span>{h.hijoWins}</span>
                    {h.draws > 0 ? (
                      <span className="ml-0.5 text-[0.65rem]">(+{h.draws}E)</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}

export default function DiaDelPadrePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duels, setDuels] = useState<ReturnType<typeof computePairwiseDuels>>([]);
  const [playedCount, setPlayedCount] = useState(0);

  useEffect(() => {
    if (!canUsePublicApp()) return;
    let cancelled = false;
    void (async () => {
      try {
        const [players, matches, lineups] = await Promise.all([
          fetchPlayers(true),
          fetchMatches(),
          fetchMatchLineups(),
        ]);
        if (cancelled) return;
        setPlayedCount(matches.filter((m) => m.status === "played").length);
        setDuels(computePairwiseDuels(players, matches, lineups));
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

  const padres = useMemo(() => groupDuelsByPadre(duels, MIN_MARGIN), [duels]);

  const totalHijos = useMemo(
    () => padres.reduce((sum, g) => sum + g.hijos.length, 0),
    [padres]
  );

  const highlights = useMemo(() => {
    if (padres.length === 0) return null;

    const mostHijos = padres[0];
    const biggestMargin = [...padres]
      .flatMap((g) => g.hijos.map((h) => ({ padre: g.padre, ...h })))
      .sort((a, b) => b.margin - a.margin || b.meetings - a.meetings)[0];

    return { mostHijos, biggestMargin };
  }, [padres]);

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Feliz día del padre</h1>
        <SetupBanner />
      </div>
    );
  }

  if (loading) {
    return <p className="text-center text-muted">Cargando duelos…</p>;
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <header className="relative overflow-hidden rounded-3xl border border-sky-500/25 bg-gradient-to-b from-sky-950/40 via-surface to-surface p-1 shadow-[0_0_48px_-20px_rgb(56_189_248/0.35)]">
        <div className="rounded-[1.35rem] bg-surface/90 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10">
              <Trophy className="h-7 w-7 text-sky-300" aria-hidden />
            </div>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-sky-200/90">
                Copa Libero
              </p>
              <h1 className="text-2xl font-bold tracking-tight">Feliz día del padre</h1>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Cada padre aparece una sola vez con todos los hijos a los que les ganó al menos {MIN_MARGIN}{" "}
                veces más cuando estuvieron en equipos opuestos.
              </p>
              {playedCount > 0 ? (
                <p className="mt-2 text-xs font-medium text-sky-200/80">
                  {playedCount} {playedCount === 1 ? "partido analizado" : "partidos analizados"} ·{" "}
                  {padres.length} {padres.length === 1 ? "padre" : "padres"} · {totalHijos}{" "}
                  {totalHijos === 1 ? "hijo" : "hijos"}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      {highlights ? (
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3">
            <p className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-accent">
              <Crown className="h-3 w-3" aria-hidden />
              Más hijos
            </p>
            <p className="mt-1 text-sm font-semibold text-fg">{playerLabel(highlights.mostHijos.padre)}</p>
            <p className="mt-0.5 text-xs text-muted">
              {highlights.mostHijos.hijos.length}{" "}
              {highlights.mostHijos.hijos.length === 1 ? "hijo" : "hijos"} con +{MIN_MARGIN}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-4 py-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">Mayor ventaja</p>
            <p className="mt-1 text-sm font-semibold text-fg">
              {playerLabel(highlights.biggestMargin.padre)} → {playerLabel(highlights.biggestMargin.hijo)}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              +{highlights.biggestMargin.margin} ({highlights.biggestMargin.padreWins}–
              {highlights.biggestMargin.hijoWins})
            </p>
          </div>
        </section>
      ) : null}

      {padres.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          {duels.length === 0
            ? "Todavía no hay partidos jugados con dos equipos completos para calcular duelos."
            : `Ningún duelo supera +${MIN_MARGIN} de ventaja todavía.`}
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Padres e hijos</h2>
            <p className="mt-1 text-xs text-muted">
              Padre a la izquierda, hijos en columnas con la diferencia de partidos ganados.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {padres.map((group, i) => (
              <PadreCard key={group.padre.id} group={group} rank={i + 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
