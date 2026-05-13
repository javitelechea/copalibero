"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SetupBanner } from "@/components/SetupBanner";
import { canUsePublicApp } from "@/lib/env";
import {
  fetchConfirmations,
  fetchMatchGoals,
  fetchMatchLineups,
  fetchMatches,
  fetchPlayerById,
  fetchPlayers,
} from "@/lib/firestore-queries";
import { computeStandings } from "@/lib/scoring";
import type { MatchRow, PlayerRow, Team } from "@/lib/types";

export default function JugadorPage() {
  const params = useParams();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [player, setPlayer] = useState<PlayerRow | null | undefined>(undefined);
  const [standings, setStandings] = useState<ReturnType<typeof computeStandings>>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [lineups, setLineups] = useState<Awaited<ReturnType<typeof fetchMatchLineups>>>([]);
  const [goals, setGoals] = useState<Awaited<ReturnType<typeof fetchMatchGoals>>>([]);

  useEffect(() => {
    if (!id || !canUsePublicApp()) return;
    let cancelled = false;
    void (async () => {
      const [p, allPlayers, m, lu, g, conf] = await Promise.all([
        fetchPlayerById(id),
        fetchPlayers(true),
        fetchMatches(),
        fetchMatchLineups(),
        fetchMatchGoals(),
        fetchConfirmations(),
      ]);
      if (cancelled) return;
      setPlayer(p);
      setStandings(computeStandings(allPlayers, m, lu, g, conf));
      setMatches(m);
      setLineups(lu);
      setGoals(g);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const mine = useMemo(() => standings.find((s) => s.player.id === id), [standings, id]);

  const played = useMemo(() => {
    const list = matches
      .filter((m) => m.status === "played")
      .map((m) => {
        const lu = lineups.find((l) => l.match_id === m.id && l.player_id === id);
        if (!lu || lu.team === "pool") return null;
        const a = m.team_a_score;
        const b = m.team_b_score;
        let result: "win" | "draw" | "loss";
        if (a === b) result = "draw";
        else if (lu.team === "A") result = a > b ? "win" : "loss";
        else result = b > a ? "win" : "loss";
        const gCount = goals
          .filter((x) => x.match_id === m.id && x.player_id === id)
          .reduce((s, x) => s + x.goals, 0);
        return { match: m, team: lu.team as Team, result, goals: gCount };
      })
      .filter(Boolean) as {
      match: MatchRow;
      team: Team;
      result: "win" | "draw" | "loss";
      goals: number;
    }[];
    list.sort((x, y) => y.match.played_at.localeCompare(x.match.played_at));
    return list;
  }, [matches, lineups, goals, id]);

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Jugador</h1>
        <SetupBanner />
      </div>
    );
  }

  if (!id) {
    return <p className="text-muted">Enlace inválido.</p>;
  }

  if (player === undefined) {
    return <p className="text-muted">Cargando…</p>;
  }

  if (!player) {
    return <p className="text-muted">Jugador no encontrado.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/jugadores" className="text-sm font-medium text-accent hover:underline">
        ← Jugadores
      </Link>

      <header className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface px-6 py-8 text-center">
        <PlayerAvatar name={player.display_name} url={player.avatar_url} size={96} />
        <div>
          <h1 className="text-2xl font-bold">{player.display_name}</h1>
          {mine && (
            <p className="mt-2 text-4xl font-black tabular-nums text-accent">{mine.points}</p>
          )}
          {mine && (
            <p className="text-sm text-muted">
              {mine.played} partidos · {mine.goals} goles · {mine.wins}V {mine.draws}E {mine.losses}D · Bonus:{" "}
              {mine.bonus}
              {mine.noShowPenalties > 0 && (
                <span className="text-amber-400">
                  {" "}
                  · {mine.noShowPenalties} falta{mine.noShowPenalties > 1 ? "s" : ""}
                </span>
              )}
            </p>
          )}
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-bold">Historial</h2>
        {played.length === 0 ? (
          <p className="text-muted">Todavía no registró partidos en el torneo.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {played.map(({ match: m, result, goals: g }) => (
              <li key={m.id}>
                <Link
                  href={`/partidos/${m.id}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 transition hover:border-accent/30"
                >
                  <span className="text-sm text-muted">
                    {new Date(m.played_at + "T12:00:00").toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="font-mono font-bold">
                    {m.team_a_score} — {m.team_b_score}
                  </span>
                  <span
                    className={
                      result === "win"
                        ? "font-semibold text-accent"
                        : result === "draw"
                          ? "text-muted"
                          : "text-muted"
                    }
                  >
                    {result === "win" ? "Victoria" : result === "draw" ? "Empate" : "Derrota"}
                    {g > 0 ? ` · ${g} gol${g > 1 ? "es" : ""}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
