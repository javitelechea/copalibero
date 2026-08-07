"use client";

import { useEffect, useState } from "react";
import { NextMatchTeamDraft } from "@/components/NextMatchTeamDraft";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { fetchTournamentSnapshot } from "@/lib/firestore-queries";
import { computeStandings } from "@/lib/scoring";
import type { MatchPlayerRow, MatchRow, MatchWithDetails, PlayerRow } from "@/lib/types";

export function MatchTeamDraftAdminSection({ match }: { match: MatchWithDetails }) {
  const { isAdmin, ready } = useIsAdmin();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [lineups, setLineups] = useState<MatchPlayerRow[]>([]);
  const [standings, setStandings] = useState<ReturnType<typeof computeStandings>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready || !isAdmin || (match.status !== "scheduled" && match.status !== "loaded")) return;
    let cancelled = false;
    setLoaded(false);
    void fetchTournamentSnapshot({ confirmations: true })
      .then((snap) => {
        if (cancelled) return;
        setPlayers(snap.players);
        setLineups(snap.lineups);
        setStandings(
          computeStandings(snap.players, snap.matches, snap.lineups, snap.goals, snap.confirmations)
        );
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, isAdmin, match.status, match.id]);

  if (!ready || !isAdmin || (match.status !== "scheduled" && match.status !== "loaded")) return null;
  if (!loaded) {
    return (
      <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        Cargando borrador de equipos…
      </p>
    );
  }

  const nextMatch: MatchRow = {
    id: match.id,
    played_at: match.played_at,
    team_a_score: match.team_a_score,
    team_b_score: match.team_b_score,
    golden_goal_winner: match.golden_goal_winner,
    status: match.status,
    notes: match.notes,
    created_at: match.created_at,
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <NextMatchTeamDraft
        embedded
        nextMatch={nextMatch}
        lineups={lineups}
        players={players}
        standings={standings}
      />
    </section>
  );
}
