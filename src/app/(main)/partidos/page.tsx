"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SetupBanner } from "@/components/SetupBanner";
import { canUsePublicApp } from "@/lib/env";
import { fetchMatches } from "@/lib/firestore-queries";
import type { MatchRow } from "@/lib/types";
import { ChevronRight } from "lucide-react";

export default function PartidosPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(canUsePublicApp);

  useEffect(() => {
    if (!canUsePublicApp()) return;
    void fetchMatches()
      .then(setMatches)
      .finally(() => setLoading(false));
  }, []);

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Partidos</h1>
        <SetupBanner />
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted">Cargando partidos…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Partidos</h1>
        <p className="mt-1 text-sm text-muted">Historial completo del torneo</p>
      </header>

      <ul className="flex flex-col gap-2">
        {matches.length === 0 ? (
          <li className="rounded-2xl border border-border bg-surface px-4 py-10 text-center text-muted">
            No hay partidos todavía.
          </li>
        ) : (
          matches.map((m) => (
            <li key={m.id}>
              <Link
                href={`/partidos/${m.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-4 transition active:scale-[0.99] hover:border-accent/40 hover:bg-surface-2"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {m.status === "scheduled" ? "Programado" : "Jugado"}
                  </p>
                  <p className="mt-0.5 font-medium">
                    {new Date(m.played_at + "T12:00:00").toLocaleDateString("es", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-surface-2 px-3 py-1.5 font-mono text-lg font-bold tabular-nums">
                    {m.team_a_score} — {m.team_b_score}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
