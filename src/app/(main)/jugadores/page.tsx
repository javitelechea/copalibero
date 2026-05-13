"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SetupBanner } from "@/components/SetupBanner";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { canUsePublicApp } from "@/lib/env";
import { fetchPlayers } from "@/lib/firestore-queries";
import type { PlayerRow } from "@/lib/types";
import { ChevronRight } from "lucide-react";

export default function JugadoresPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(canUsePublicApp);

  useEffect(() => {
    if (!canUsePublicApp()) return;
    void fetchPlayers(true)
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, []);

  if (!canUsePublicApp()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Jugadores</h1>
        <SetupBanner />
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Jugadores</h1>
        <p className="mt-1 text-sm text-muted">Estadísticas individuales</p>
      </header>

      <ul className="flex flex-col gap-2">
        {players.map((p) => (
          <li key={p.id}>
            <Link
              href={`/jugadores/${p.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition active:scale-[0.99] hover:border-accent/40 hover:bg-surface-2"
            >
              <PlayerAvatar name={p.display_name} url={p.avatar_url} size={52} />
              <span className="min-w-0 flex-1 truncate text-lg font-semibold">{p.display_name}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
