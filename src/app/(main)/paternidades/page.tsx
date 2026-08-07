"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SetupBanner } from "@/components/SetupBanner";
import { canUsePublicApp } from "@/lib/env";
import { fetchTournamentSnapshot } from "@/lib/firestore-queries";
import { playerLabel } from "@/lib/player-label";
import { isTablePlayer } from "@/lib/player-guest";
import {
  computePairwiseDuels,
  groupDuelsByPadre,
  type PadreGroup,
} from "@/lib/pairwise-duels";

const MIN_MARGIN = 3;

function PadreCard({ group, rank }: { group: PadreGroup; rank: number }) {
  const bestMargin = group.hijos[0]?.margin ?? 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-col sm:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-2 border-b border-border bg-surface-2 px-4 py-4 sm:w-36 sm:border-b-0 sm:border-r md:w-40">
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">#{rank}</span>
          <Link href={`/jugadores/${group.padre.id}`} className="flex flex-col items-center gap-2 text-center">
            <PlayerAvatar name={playerLabel(group.padre)} url={group.padre.avatar_url} size={52} />
            <span className="line-clamp-3 text-sm font-bold leading-tight text-accent">
              {playerLabel(group.padre)}
            </span>
          </Link>
          <p className="text-center text-[0.65rem] font-medium text-muted">
            {group.hijos.length} {group.hijos.length === 1 ? "hijo" : "hijos"} · +{bestMargin} máx
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

export default function PaternidadesPage() {
  const [loading, setLoading] = useState(canUsePublicApp);
  const [error, setError] = useState<string | null>(null);
  const [duels, setDuels] = useState<ReturnType<typeof computePairwiseDuels>>([]);
  const [playedCount, setPlayedCount] = useState(0);

  useEffect(() => {
    if (!canUsePublicApp()) return;
    let cancelled = false;
    void (async () => {
      try {
        const { players, matches, lineups } = await fetchTournamentSnapshot({
          goals: false,
          confirmations: false,
        });
        if (cancelled) return;
        const torneo = players.filter(isTablePlayer);
        setPlayedCount(matches.filter((m) => m.status === "played").length);
        setDuels(computePairwiseDuels(torneo, matches, lineups));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar paternidades");
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

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Paternidades</h1>
        <SetupBanner />
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted">Cargando paternidades…</p>;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Paternidades</h1>
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Paternidades</h1>
        <p className="mt-1 text-sm text-muted">
          Quién le ganó a quién en equipos opuestos (ventaja de al menos +{MIN_MARGIN} partidos). Se actualiza
          sola con cada partido jugado.
          {playedCount > 0 ? (
            <>
              {" "}
              · {playedCount} {playedCount === 1 ? "partido" : "partidos"} · {padres.length}{" "}
              {padres.length === 1 ? "padre" : "padres"} · {totalHijos}{" "}
              {totalHijos === 1 ? "hijo" : "hijos"}
            </>
          ) : null}
        </p>
      </header>

      {padres.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-muted">
          {duels.length === 0
            ? "Todavía no hay partidos jugados con equipos opuestos para calcular paternidades."
            : `Ningún duelo supera +${MIN_MARGIN} de ventaja todavía.`}
        </p>
      ) : (
        <>
          <div className="w-full min-w-0 rounded-2xl border border-border bg-surface shadow-sm">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col style={{ width: "10%" }} />
                <col style={{ width: "44%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "24%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-surface-2 text-xs font-bold uppercase tracking-wide text-muted">
                  <th className="px-2 py-2 text-center">#</th>
                  <th className="px-2 py-2 text-left">Padre</th>
                  <th className="px-2 py-2 text-center">Hijos</th>
                  <th className="px-2 py-2 text-center text-accent">Mejor +</th>
                </tr>
              </thead>
              <tbody>
                {padres.map((group, i) => (
                  <tr
                    key={group.padre.id}
                    className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-2/60"
                  >
                    <td className="px-2 py-2 text-center align-middle tabular-nums text-muted">{i + 1}</td>
                    <td className="min-w-0 px-2 py-2 align-middle">
                      <Link
                        href={`/jugadores/${group.padre.id}`}
                        className="flex min-w-0 items-center gap-2 active:opacity-90"
                      >
                        <PlayerAvatar name={playerLabel(group.padre)} url={group.padre.avatar_url} size={36} />
                        <span className="min-w-0 truncate font-semibold">{playerLabel(group.padre)}</span>
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-center align-middle tabular-nums">{group.hijos.length}</td>
                    <td className="px-2 py-2 text-center align-middle font-black tabular-nums text-accent">
                      +{group.hijos[0]?.margin ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Detalle por padre</h2>
            {padres.map((group, i) => (
              <PadreCard key={group.padre.id} group={group} rank={i + 1} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
