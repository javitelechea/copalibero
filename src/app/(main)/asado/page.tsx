"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SetupBanner } from "@/components/SetupBanner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { canUsePublicApp, isOfflineDemoData } from "@/lib/env";
import { asadoPointsForRow } from "@/lib/asado-points";
import { formatMatchDayShort } from "@/lib/next-match";
import { fetchAllAsadoAttendees, fetchAsados, fetchPlayers, saveAsado } from "@/lib/firestore-queries";
import type { AsadoAttendeeRow, AsadoRow, PlayerRow } from "@/lib/types";
import { ChevronRight, Flame, Plus } from "lucide-react";

export default function AsadoPage() {
  const router = useRouter();
  const { isAdmin, ready } = useIsAdmin();
  const [asados, setAsados] = useState<AsadoRow[]>([]);
  const [allAttendees, setAllAttendees] = useState<AsadoAttendeeRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const latestAsado = asados[0] ?? null;

  const reload = useCallback(async () => {
    if (!canUsePublicApp()) return;
    setLoading(true);
    setError(null);
    try {
      const [list, pl, all] = await Promise.all([
        fetchAsados(),
        fetchPlayers(true),
        fetchAllAsadoAttendees(),
      ]);
      setAsados(list);
      setPlayers(pl);
      setAllAttendees(all);
    } catch (e) {
      let msg = e instanceof Error ? e.message : "Error al cargar";
      if (/permission|insufficient permissions/i.test(msg)) {
        msg +=
          " — Publicá las reglas de Firestore que incluyen las colecciones `asados` y `asado_players` (archivo `firebase/firestore.rules` en el proyecto). En consola: Firebase → Firestore → Reglas → pegar y Publicar, o desde esta carpeta: `npx firebase deploy --only firestore:rules` (con `firebase login` y proyecto vinculado).";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const leaderboard = useMemo(() => {
    const acc = new Map<
      string,
      {
        meatTimes: number;
        stayedTimes: number;
        panTimes: number;
        postreTimes: number;
        points: number;
      }
    >();
    for (const r of allAttendees) {
      const cur =
        acc.get(r.player_id) ?? {
          meatTimes: 0,
          stayedTimes: 0,
          panTimes: 0,
          postreTimes: 0,
          points: 0,
        };
      if (r.bought_meat) cur.meatTimes += 1;
      if (r.stayed) cur.stayedTimes += 1;
      if (r.panificado) cur.panTimes += 1;
      if (r.postre) cur.postreTimes += 1;
      cur.points += asadoPointsForRow(r);
      acc.set(r.player_id, cur);
    }
    const rows = players.map((p) => {
      const t = acc.get(p.id);
      return {
        player: p,
        meatTimes: t?.meatTimes ?? 0,
        stayedTimes: t?.stayedTimes ?? 0,
        panTimes: t?.panTimes ?? 0,
        postreTimes: t?.postreTimes ?? 0,
        asadoPoints: t?.points ?? 0,
      };
    });
    rows.sort((a, b) => {
      if (b.asadoPoints !== a.asadoPoints) return b.asadoPoints - a.asadoPoints;
      if (b.stayedTimes !== a.stayedTimes) return b.stayedTimes - a.stayedTimes;
      if (b.meatTimes !== a.meatTimes) return b.meatTimes - a.meatTimes;
      if (b.panTimes !== a.panTimes) return b.panTimes - a.panTimes;
      if (b.postreTimes !== a.postreTimes) return b.postreTimes - a.postreTimes;
      return a.player.display_name.localeCompare(b.player.display_name);
    });
    return rows;
  }, [allAttendees, players]);

  async function createAsado() {
    if (!isAdmin) return;
    const held = new Date().toISOString().slice(0, 10);
    setBusy(true);
    setError(null);
    try {
      const { id } = await saveAsado({
        id: null,
        held_at: held,
        notes: null,
        total_cost: null,
        attendees: [],
      });
      router.push(`/asado/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setBusy(false);
    }
  }

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Asado</h1>
        <SetupBanner />
      </div>
    );
  }

  if (loading) {
    return <p className="text-center text-muted">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <header className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10">
          <Flame className="h-7 w-7 text-accent" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asado</h1>
          <p className="mt-1 text-sm text-muted">
            Tocá el asado del día para cargar convocados, carne y calculadora. Abajo va el acumulado de todos.
          </p>
        </div>
      </header>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      <div className="flex min-h-0 flex-col gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Asado del día</h2>
        {latestAsado ? (
          <div className="flex flex-col gap-2">
            <Link
              href={`/asado/${latestAsado.id}`}
              className="flex min-h-[5.5rem] items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-surface px-4 py-4 shadow-[var(--shadow-glow)] transition hover:border-accent/50 hover:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold tracking-tight">{formatMatchDayShort(latestAsado.held_at)}</p>
                {latestAsado.notes ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{latestAsado.notes}</p>
                ) : (
                  <p className="mt-0.5 text-sm text-muted">Convocados, compra de carne y reparto del gasto</p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-accent" aria-hidden />
            </Link>
            {asados.length > 1 ? (
              <p className="text-xs text-muted">
                Otras fechas:{" "}
                {asados.slice(1).map((a, i) => (
                  <span key={a.id}>
                    {i > 0 ? " · " : null}
                    <Link href={`/asado/${a.id}`} className="font-medium text-accent hover:underline">
                      {formatMatchDayShort(a.held_at)}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
            {ready && isAdmin && !isOfflineDemoData() ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void createAsado()}
                className="flex min-h-[44px] items-center justify-center gap-2 self-start rounded-xl border border-accent/40 bg-accent/10 px-4 text-sm font-bold text-accent hover:bg-accent/20 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Nueva fecha
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-[5.5rem] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
            <p>Todavía no hay ninguna fecha de asado.</p>
            {ready && isAdmin ? (
              <button
                type="button"
                disabled={busy || isOfflineDemoData()}
                onClick={() => void createAsado()}
                className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-canvas disabled:opacity-50"
              >
                Cargar primera fecha
              </button>
            ) : null}
            {isOfflineDemoData() ? (
              <p className="text-xs">En modo demo conectá Firebase o D1 para guardar.</p>
            ) : null}
          </div>
        )}
      </div>

      <section className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border bg-surface-2 px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Tabla general de asados</h2>
          <p className="mt-1 text-xs text-muted">
            <strong>Pts</strong>: suma 1 si se quedó + 1 por carne, panificado o postre en cada fecha. Columnas:
            veces en cada categoría. Orden por Pts y desempates por esas columnas.
          </p>
        </div>
        <div className="w-full min-w-0 p-1 sm:p-3">
          <table className="w-full table-fixed border-collapse text-[clamp(0.5625rem,2.45vw,0.875rem)] leading-tight sm:text-sm">
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: "34%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-[0.58rem] font-bold uppercase tracking-wide text-muted sm:text-xs">
                <th className="px-0 py-1.5 text-center sm:py-2">#</th>
                <th className="min-w-0 px-0.5 py-1.5 sm:px-1 sm:py-2">
                  <span className="sm:hidden">Jug</span>
                  <span className="hidden sm:inline">Jugador</span>
                </th>
                <th className="px-0 py-1.5 text-center text-accent sm:py-2" title="Puntos asado">
                  Pts
                </th>
                <th className="px-0 py-1.5 text-center sm:py-2" title="Se quedó">
                  <span className="sm:hidden">St</span>
                  <span className="hidden sm:inline">Se quedó</span>
                </th>
                <th className="px-0 py-1.5 text-center sm:py-2" title="Carne">
                  <span className="sm:hidden">Cr</span>
                  <span className="hidden sm:inline">Carne</span>
                </th>
                <th className="px-0 py-1.5 text-center sm:py-2" title="Panificado">
                  <span className="sm:hidden">Pan</span>
                  <span className="hidden sm:inline">Panificado</span>
                </th>
                <th className="px-0 py-1.5 text-center sm:py-2" title="Postre">
                  <span className="sm:hidden">Po</span>
                  <span className="hidden sm:inline">Postre</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, i) => (
                <tr key={row.player.id} className="border-b border-border/70 last:border-b-0">
                  <td className="px-0 py-1 text-center tabular-nums text-muted sm:py-2">{i + 1}</td>
                  <td className="min-w-0 px-0.5 py-1 sm:px-1 sm:py-2">
                    <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                      <PlayerAvatar
                        name={row.player.display_name}
                        url={row.player.avatar_url}
                        size={22}
                        className="text-[10px] sm:text-sm"
                      />
                      <span className="min-w-0 truncate font-medium">{row.player.display_name}</span>
                    </div>
                  </td>
                  <td className="px-0 py-1 text-center font-black tabular-nums text-accent sm:py-2">
                    {row.asadoPoints}
                  </td>
                  <td className="px-0 py-1 text-center tabular-nums text-muted sm:py-2">{row.stayedTimes}</td>
                  <td className="px-0 py-1 text-center font-semibold tabular-nums text-fg sm:py-2">{row.meatTimes}</td>
                  <td className="px-0 py-1 text-center font-semibold tabular-nums text-fg sm:py-2">{row.panTimes}</td>
                  <td className="px-0 py-1 text-center font-semibold tabular-nums text-fg sm:py-2">{row.postreTimes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
