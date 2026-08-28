"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { SetupBanner } from "@/components/SetupBanner";
import { canUsePublicApp } from "@/lib/env";
import { fetchTournamentSnapshot } from "@/lib/firestore-queries";
import { computeCuriosities, type Curiosity, type CuriositySection } from "@/lib/curiosities";

function CuriosityCard({ item }: { item: Curiosity }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm leading-relaxed text-fg">{item.text}</p>
        {item.stat ? (
          <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-black tabular-nums text-accent">
            {item.stat}
          </span>
        ) : null}
      </div>
      {item.matchId ? (
        <Link
          href={`/partidos/${item.matchId}`}
          className="mt-3 inline-block text-xs font-medium text-accent"
        >
          Ver partido
        </Link>
      ) : null}
    </article>
  );
}

export default function CuriosidadesPage() {
  const [loading, setLoading] = useState(canUsePublicApp);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<CuriositySection[]>([]);

  useEffect(() => {
    if (!canUsePublicApp()) return;
    let cancelled = false;
    void (async () => {
      try {
        const { matches } = await fetchTournamentSnapshot({
          confirmations: false,
        });
        if (cancelled) return;
        setSections(computeCuriosities(matches));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar curiosidades");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Curiosidades</h1>
        <SetupBanner />
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted">Buscando rarezas en el historial…</p>;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Curiosidades</h1>
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
          <Sparkles className="h-4 w-4" />
          Del historial
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Curiosidades</h1>
        <p className="mt-1 text-sm text-muted">
          Estadísticas de los jueves: Blanco y Negro, palizas, gol de oro y récords de partidos.
        </p>
      </header>

      {sections.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-muted">
          Todavía no hay partidos suficientes para sacar conclusiones.
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.id} className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{section.title}</h2>
            <ul className="flex flex-col gap-2">
              {section.items.map((item) => (
                <li key={item.id}>
                  <CuriosityCard item={item} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
