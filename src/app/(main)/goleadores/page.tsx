"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SetupBanner } from "@/components/SetupBanner";
import { canUsePublicApp } from "@/lib/env";
import { fetchMatchGoals, fetchMatches, fetchPlayers } from "@/lib/firestore-queries";
import { playerLabel } from "@/lib/player-label";
import { computeTopScorers } from "@/lib/top-scorers";

export default function GoleadoresPage() {
  const [rows, setRows] = useState<ReturnType<typeof computeTopScorers>>([]);
  const [loading, setLoading] = useState(canUsePublicApp);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canUsePublicApp()) return;
    let cancelled = false;
    void (async () => {
      try {
        const [players, matches, goals] = await Promise.all([
          fetchPlayers(true),
          fetchMatches(),
          fetchMatchGoals(),
        ]);
        if (cancelled) return;
        setRows(computeTopScorers(players, matches, goals));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar goleadores");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalGoals = useMemo(() => rows.reduce((s, r) => s + r.goals, 0), [rows]);

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Goleadores</h1>
        <SetupBanner />
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted">Cargando goleadores…</p>;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Goleadores</h1>
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Goleadores</h1>
        <p className="mt-1 text-sm text-muted">
          Goles acumulados en todos los partidos finalizados
          {totalGoals > 0 ? (
            <>
              {" "}
              · <span className="font-semibold text-fg">{totalGoals}</span> en total
            </>
          ) : null}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-muted">
          Todavía no hay goles registrados en partidos jugados.
        </p>
      ) : (
        <div className="w-full min-w-0 rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "40%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-surface-2 text-xs font-bold uppercase tracking-wide text-muted">
                <th className="px-2 py-2 text-center">#</th>
                <th className="px-2 py-2 text-left">Apodo</th>
                <th className="px-2 py-2 text-center" title="Partidos en los que anotó">
                  Partidos
                </th>
                <th className="px-2 py-2 text-center text-accent">Goles</th>
                <th className="px-2 py-2 text-center" title="Goles por partido">
                  G/P
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.player.id}
                  className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-2/60"
                >
                  <td className="px-2 py-2 text-center align-middle tabular-nums text-muted">{i + 1}</td>
                  <td className="min-w-0 px-2 py-2 align-middle">
                    <Link
                      href={`/jugadores/${row.player.id}`}
                      className="flex min-w-0 items-center gap-2 active:opacity-90"
                    >
                      <PlayerAvatar name={playerLabel(row.player)} url={row.player.avatar_url} size={36} />
                      <span className="min-w-0 truncate font-semibold">{playerLabel(row.player)}</span>
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-center align-middle tabular-nums text-muted">
                    {row.scoringMatches}
                  </td>
                  <td className="px-2 py-2 text-center align-middle font-black tabular-nums text-accent">
                    {row.goals}
                  </td>
                  <td className="px-2 py-2 text-center align-middle tabular-nums text-muted">
                    {row.scoringMatches > 0
                      ? (row.goals / row.scoringMatches).toFixed(1)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
