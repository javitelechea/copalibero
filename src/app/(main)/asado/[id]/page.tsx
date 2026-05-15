"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SetupBanner } from "@/components/SetupBanner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { canUsePublicApp, isOfflineDemoData } from "@/lib/env";
import { formatMatchDayShort } from "@/lib/next-match";
import {
  fetchAsadoAttendees,
  fetchAsados,
  fetchPlayers,
  saveAsado,
  type SaveAsadoBody,
} from "@/lib/firestore-queries";
import type { AsadoAttendeeRow, AsadoRow, PlayerRow } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

type LocalAttendee = {
  player_id: string;
  portions: number;
  stayed: boolean;
  bought_meat: boolean;
  panificado: boolean;
  postre: boolean;
};

function attendeeToLocal(a: AsadoAttendeeRow): LocalAttendee {
  return {
    player_id: a.player_id,
    portions: a.portions,
    stayed: a.stayed,
    bought_meat: a.bought_meat,
    panificado: a.panificado,
    postre: a.postre,
  };
}

function moneyArs(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AsadoDiaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { isAdmin, ready } = useIsAdmin();

  const [asados, setAsados] = useState<AsadoRow[]>([]);
  const [attendees, setAttendees] = useState<AsadoAttendeeRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickPlayerId, setPickPlayerId] = useState("");

  const reload = useCallback(async () => {
    if (!canUsePublicApp() || !id) return;
    setLoading(true);
    setError(null);
    try {
      const [list, pl, att] = await Promise.all([
        fetchAsados(),
        fetchPlayers(true),
        fetchAsadoAttendees(id),
      ]);
      setAsados(list);
      setPlayers(pl);
      setAttendees(att);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectedAsado = useMemo(() => asados.find((a) => a.id === id) ?? null, [asados, id]);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const rowsWithPlayer = useMemo(() => {
    return [...attendees]
      .map((a) => ({
        ...a,
        player: playerById.get(a.player_id) ?? null,
      }))
      .sort((a, b) => {
        const na = a.player?.display_name ?? a.player_id;
        const nb = b.player?.display_name ?? b.player_id;
        return na.localeCompare(nb);
      });
  }, [attendees, playerById]);

  const stayedCount = useMemo(() => attendees.filter((a) => a.stayed).length, [attendees]);
  const totalCost = selectedAsado?.total_cost ?? null;
  const share =
    totalCost != null && Number.isFinite(totalCost) && stayedCount > 0 ? totalCost / stayedCount : null;

  async function persist(next: { asado: AsadoRow; list: LocalAttendee[] }) {
    if (!isAdmin) return;
    setBusy(true);
    setError(null);
    try {
      const body: SaveAsadoBody = {
        id: next.asado.id,
        held_at: next.asado.held_at,
        notes: next.asado.notes,
        total_cost: next.asado.total_cost,
        attendees: next.list.map((a) => ({
          player_id: a.player_id,
          portions: a.portions,
          stayed: a.stayed,
          bought_meat: a.bought_meat,
          panificado: a.panificado,
          postre: a.postre,
        })),
      };
      await saveAsado(body);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  function updateAttendee(playerId: string, patch: Partial<LocalAttendee>) {
    if (!selectedAsado || !isAdmin) return;
    const list: LocalAttendee[] = attendees.map(attendeeToLocal);
    const i = list.findIndex((a) => a.player_id === playerId);
    if (i < 0) return;
    list[i] = { ...list[i], ...patch };
    void persist({ asado: selectedAsado, list });
  }

  function removeAttendee(playerId: string) {
    if (!selectedAsado || !isAdmin) return;
    const list = attendees.filter((a) => a.player_id !== playerId).map(attendeeToLocal);
    void persist({ asado: selectedAsado, list });
  }

  function addAttendee() {
    if (!selectedAsado || !isAdmin || !pickPlayerId) return;
    if (attendees.some((a) => a.player_id === pickPlayerId)) return;
    const list: LocalAttendee[] = [
      ...attendees.map(attendeeToLocal),
      {
        player_id: pickPlayerId,
        portions: 0,
        stayed: false,
        bought_meat: false,
        panificado: false,
        postre: false,
      },
    ];
    setPickPlayerId("");
    void persist({ asado: selectedAsado, list });
  }

  async function createAsado() {
    if (!isAdmin) return;
    const held = new Date().toISOString().slice(0, 10);
    setBusy(true);
    setError(null);
    try {
      const { id: newId } = await saveAsado({
        id: null,
        held_at: held,
        notes: null,
        total_cost: null,
        attendees: [],
      });
      router.push(`/asado/${newId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setBusy(false);
    }
  }

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Asado del día</h1>
        <SetupBanner />
      </div>
    );
  }

  if (!id) {
    return <p className="text-muted">Enlace inválido.</p>;
  }

  if (loading) {
    return <p className="text-center text-muted">Cargando…</p>;
  }

  if (!selectedAsado) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/asado" className="text-sm font-medium text-accent hover:underline">
          ← Asado
        </Link>
        <p className="text-muted">No encontramos esta fecha de asado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <Link href="/asado" className="text-sm font-medium text-accent hover:underline">
        ← Tabla general de asados
      </Link>

      <header className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Asado del día</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold tracking-tight">{formatMatchDayShort(selectedAsado.held_at)}</p>
            {selectedAsado.notes ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted">{selectedAsado.notes}</p>
            ) : null}
          </div>
          <label className="shrink-0 text-xs text-muted">
            Otra fecha
            <select
              value={id}
              onChange={(e) => {
                const v = e.target.value;
                if (v && v !== id) router.push(`/asado/${v}`);
              }}
              className="mt-1 block min-h-[44px] min-w-[12rem] rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-fg"
            >
              {asados.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatMatchDayShort(a.held_at)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {ready && isAdmin && !isOfflineDemoData() ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void createAsado()}
            className="mt-3 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 text-sm font-bold text-accent hover:bg-accent/20 disabled:opacity-50 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nueva fecha
          </button>
        ) : null}
      </header>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      {ready && isAdmin ? (
        <label className="block text-xs text-muted">
          Cambiar fecha (AAAA-MM-DD)
          <input
            type="date"
            value={selectedAsado.held_at}
            disabled={busy || isOfflineDemoData()}
            onChange={(e) => {
              const held_at = e.target.value;
              if (!held_at) return;
              void persist({
                asado: { ...selectedAsado, held_at },
                list: attendees.map(attendeeToLocal),
              });
            }}
            className="mt-1 min-h-[44px] w-full max-w-xs rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg"
          />
        </label>
      ) : null}

      {ready && isAdmin ? (
        <label className="block text-xs text-muted">
          Notas de esta fecha
          <textarea
            key={`notes-${selectedAsado.id}-${selectedAsado.notes ?? ""}`}
            defaultValue={selectedAsado.notes ?? ""}
            disabled={busy || isOfflineDemoData()}
            rows={2}
            onBlur={(e) => {
              const notes = e.target.value.trim() || null;
              if (notes === (selectedAsado.notes ?? "")) return;
              void persist({
                asado: { ...selectedAsado, notes },
                list: attendees.map(attendeeToLocal),
              });
            }}
            className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-accent/20 focus:ring-2"
          />
        </label>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Quiénes fueron</h2>
        {ready && isAdmin && !isOfflineDemoData() ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-xs text-muted">
              Sumar jugador
              <select
                value={pickPlayerId}
                onChange={(e) => setPickPlayerId(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
              >
                <option value="">Elegí…</option>
                {players
                  .filter((p) => !attendees.some((a) => a.player_id === p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !pickPlayerId}
              onClick={() => addAttendee()}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-4 font-bold text-canvas disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-muted">
          Puntos del torneo de asado: 1 por &quot;Se quedó&quot;, 1 más por cada aporte (carne, panificado, postre).
          Las porciones no suman puntos.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs font-bold uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Jugador</th>
                <th className="w-20 px-1 py-2 text-center">Porc.</th>
                <th className="w-24 px-1 py-2 text-center">Se quedó</th>
                <th className="w-24 px-1 py-2 text-center">Carne</th>
                <th className="w-28 px-1 py-2 text-center">Panificado</th>
                <th className="w-24 px-1 py-2 text-center">Postre</th>
                {ready && isAdmin ? <th className="w-12 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {rowsWithPlayer.length === 0 ? (
                <tr>
                  <td colSpan={ready && isAdmin ? 7 : 6} className="px-3 py-6 text-center text-muted">
                    Nadie cargado para esta fecha. {isAdmin ? "Agregá quiénes fueron." : ""}
                  </td>
                </tr>
              ) : (
                rowsWithPlayer.map((r) => (
                  <tr key={r.player_id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar
                          name={r.player?.display_name ?? "?"}
                          url={r.player?.avatar_url ?? null}
                          size={32}
                        />
                        <span className="truncate font-medium">{r.player?.display_name ?? r.player_id}</span>
                      </div>
                    </td>
                    <td className="px-1 py-2 text-center tabular-nums">
                      {ready && isAdmin && !isOfflineDemoData() ? (
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          key={`p-${selectedAsado.id}-${r.player_id}-${r.portions}`}
                          defaultValue={r.portions}
                          disabled={busy}
                          className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-center"
                          onBlur={(e) => {
                            const v = Math.max(0, Math.trunc(Number(e.target.value) || 0));
                            if (v !== r.portions) updateAttendee(r.player_id, { portions: v });
                          }}
                        />
                      ) : (
                        r.portions
                      )}
                    </td>
                    <td className="px-1 py-2 text-center">
                      {ready && isAdmin && !isOfflineDemoData() ? (
                        <label className="inline-flex cursor-pointer flex-col items-center gap-0.5 text-[0.65rem] text-muted">
                          <input
                            type="checkbox"
                            checked={r.stayed}
                            disabled={busy}
                            onChange={(e) => updateAttendee(r.player_id, { stayed: e.target.checked })}
                            className="size-5 accent-accent"
                          />
                          <span>1 pt</span>
                        </label>
                      ) : r.stayed ? (
                        <span className="text-accent">Sí</span>
                      ) : (
                        <span className="text-muted">No</span>
                      )}
                    </td>
                    <td className="px-1 py-2 text-center">
                      {ready && isAdmin && !isOfflineDemoData() ? (
                        <label className="inline-flex cursor-pointer flex-col items-center gap-0.5 text-[0.65rem] text-muted">
                          <input
                            type="checkbox"
                            checked={r.bought_meat}
                            disabled={busy}
                            onChange={(e) =>
                              updateAttendee(r.player_id, { bought_meat: e.target.checked })
                            }
                            className="size-5 accent-accent"
                          />
                          <span>+1 pt</span>
                        </label>
                      ) : r.bought_meat ? (
                        <span className="text-accent">Sí</span>
                      ) : (
                        <span className="text-muted">No</span>
                      )}
                    </td>
                    <td className="px-1 py-2 text-center">
                      {ready && isAdmin && !isOfflineDemoData() ? (
                        <label className="inline-flex cursor-pointer flex-col items-center gap-0.5 text-[0.65rem] text-muted">
                          <input
                            type="checkbox"
                            checked={r.panificado}
                            disabled={busy}
                            onChange={(e) =>
                              updateAttendee(r.player_id, { panificado: e.target.checked })
                            }
                            className="size-5 accent-accent"
                          />
                          <span>+1 pt</span>
                        </label>
                      ) : r.panificado ? (
                        <span className="text-accent">Sí</span>
                      ) : (
                        <span className="text-muted">No</span>
                      )}
                    </td>
                    <td className="px-1 py-2 text-center">
                      {ready && isAdmin && !isOfflineDemoData() ? (
                        <label className="inline-flex cursor-pointer flex-col items-center gap-0.5 text-[0.65rem] text-muted">
                          <input
                            type="checkbox"
                            checked={r.postre}
                            disabled={busy}
                            onChange={(e) => updateAttendee(r.player_id, { postre: e.target.checked })}
                            className="size-5 accent-accent"
                          />
                          <span>+1 pt</span>
                        </label>
                      ) : r.postre ? (
                        <span className="text-accent">Sí</span>
                      ) : (
                        <span className="text-muted">No</span>
                      )}
                    </td>
                    {ready && isAdmin && !isOfflineDemoData() ? (
                      <td className="py-2 pr-2 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeAttendee(r.player_id)}
                          className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-300"
                          aria-label={`Quitar ${r.player?.display_name ?? "jugador"}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    ) : ready && isAdmin ? (
                      <td className="py-2 pr-2" />
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">Calculadora</h2>
        <p className="mt-1 text-xs text-muted">
          El costo de este día se divide entre quienes marcaron &quot;Se quedó&quot;.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-surface/90 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Costo total del día</dt>
            <dd className="mt-2">
              {ready && isAdmin && !isOfflineDemoData() ? (
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="decimal"
                  key={`cost-${selectedAsado.id}-${totalCost ?? "null"}`}
                  defaultValue={totalCost ?? ""}
                  placeholder="Pesos"
                  disabled={busy}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-semibold tabular-nums"
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const next = raw === "" ? null : Math.max(0, Number(raw));
                    if (next === totalCost || (next === null && totalCost === null)) return;
                    void persist({
                      asado: { ...selectedAsado, total_cost: next },
                      list: attendees.map(attendeeToLocal),
                    });
                  }}
                />
              ) : totalCost != null ? (
                <span className="text-lg font-bold tabular-nums text-fg">{moneyArs(totalCost)}</span>
              ) : (
                <span className="text-muted">Sin cargar</span>
              )}
            </dd>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface/90 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">En el reparto</dt>
            <dd className="mt-2 text-lg font-bold tabular-nums text-fg">{stayedCount}</dd>
          </div>
          <div className="sm:col-span-2">
            <div className="rounded-xl border border-accent/25 bg-surface p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">A cada uno le toca</dt>
              <dd className="mt-1 text-2xl font-black tabular-nums text-accent">
                {share != null ? moneyArs(share) : "—"}
              </dd>
              {stayedCount === 0 && totalCost != null && totalCost > 0 ? (
                <p className="mt-2 text-xs text-amber-200/90">
                  Marcá &quot;Se quedó&quot; en alguien que haya ido para calcular el reparto.
                </p>
              ) : null}
            </div>
          </div>
        </dl>
      </section>
    </div>
  );
}
