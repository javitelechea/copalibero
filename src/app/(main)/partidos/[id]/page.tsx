"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SetupBanner } from "@/components/SetupBanner";
import { canUsePublicApp } from "@/lib/env";
import { fetchMatchById } from "@/lib/firestore-queries";
import type { MatchWithDetails } from "@/lib/types";

export default function PartidoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [match, setMatch] = useState<MatchWithDetails | null | undefined>(undefined);

  useEffect(() => {
    if (!canUsePublicApp() || !id) return;
    void fetchMatchById(id).then(setMatch);
  }, [id]);

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

  const teamA = match.match_players.filter((r) => r.team === "A" && r.players);
  const teamB = match.match_players.filter((r) => r.team === "B" && r.players);

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
    list.sort((a, b) => a.display_name.localeCompare(b.display_name));
    return list;
  })();

  const goalsByPlayer = new Map<string, number>();
  for (const g of match.match_goals) {
    goalsByPlayer.set(g.player_id, (goalsByPlayer.get(g.player_id) ?? 0) + g.goals);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/partidos" className="text-sm font-medium text-accent hover:underline">
        ← Partidos
      </Link>

      <header className="rounded-3xl border border-border bg-gradient-to-br from-surface to-surface-2 p-6 shadow-[var(--shadow-glow)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          {match.status === "scheduled" ? "Programado" : "Resultado"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {new Date(match.played_at + "T12:00:00").toLocaleDateString("es", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <span className="text-5xl font-black tabular-nums text-accent">{match.team_a_score}</span>
          <span className="text-2xl font-light text-muted">—</span>
          <span className="text-5xl font-black tabular-nums text-accent">{match.team_b_score}</span>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Equipo A</h2>
          {teamA.length === 0 ? (
            <p className="text-sm text-muted">Sin jugadores asignados.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {teamA.map((r) => {
                const p = r.players!;
                const g = goalsByPlayer.get(p.id) ?? 0;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/jugadores/${p.id}`}
                      className="flex items-center gap-2 rounded-xl py-1.5 transition hover:bg-surface-2"
                    >
                      <PlayerAvatar name={p.display_name} url={p.avatar_url} size={40} />
                      <span className="min-w-0 flex-1 truncate font-medium">{p.display_name}</span>
                      {g > 0 && (
                        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                          {g} gol{g > 1 ? "es" : ""}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Equipo B</h2>
          {teamB.length === 0 ? (
            <p className="text-sm text-muted">Sin jugadores asignados.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {teamB.map((r) => {
                const p = r.players!;
                const g = goalsByPlayer.get(p.id) ?? 0;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/jugadores/${p.id}`}
                      className="flex items-center gap-2 rounded-xl py-1.5 transition hover:bg-surface-2"
                    >
                      <PlayerAvatar name={p.display_name} url={p.avatar_url} size={40} />
                      <span className="min-w-0 flex-1 truncate font-medium">{p.display_name}</span>
                      {g > 0 && (
                        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                          {g} gol{g > 1 ? "es" : ""}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Jugadores convocados</h2>
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
                  <PlayerAvatar name={p.display_name} url={p.avatar_url} size={40} />
                  <span className="min-w-0 flex-1 truncate font-medium">{p.display_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {match.notes && (
        <p className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
          {match.notes}
        </p>
      )}
    </div>
  );
}
