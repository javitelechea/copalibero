"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchMatches } from "@/lib/firestore-queries";
import { LIBERO_MATCH_NOTES, nextThursdayLocalYmd } from "@/lib/weekly-match-defaults";
import type { MatchRow } from "@/lib/types";
import { ChevronRight, Plus } from "lucide-react";

export default function AdminPartidosPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchMatches()
      .then(setMatches)
      .finally(() => setLoading(false));
  }, []);

  const quickNewHref = useMemo(() => {
    const fecha = nextThursdayLocalYmd();
    const notes = encodeURIComponent(LIBERO_MATCH_NOTES);
    return `/admin/partidos/nuevo?plantilla=libero&fecha=${fecha}&notas=${notes}`;
  }, []);

  if (loading) {
    return <p className="text-muted">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partidos</h1>
          <p className="mt-1 text-sm text-muted">Crear o editar fechas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={quickNewHref}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-accent/50 bg-accent/10 px-4 text-sm font-bold text-accent sm:flex-initial"
          >
            Crear próximo (jueves 22 h)
          </Link>
          <Link
            href="/admin/partidos/nuevo"
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-canvas sm:flex-initial"
          >
            <Plus className="h-5 w-5" />
            Nuevo
          </Link>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {matches.map((m) => (
          <li key={m.id}>
            <Link
              href={`/admin/partidos/${m.id}/editar`}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-4 transition hover:border-accent/40"
            >
              <span className="text-sm">
                {new Date(m.played_at + "T12:00:00").toLocaleDateString("es", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="font-mono font-bold tabular-nums">
                {m.team_a_score} — {m.team_b_score}
              </span>
              <ChevronRight className="h-5 w-5 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
