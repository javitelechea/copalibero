"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MatchForm } from "@/components/admin/MatchForm";
import { fetchPlayers } from "@/lib/firestore-queries";
import { LIBERO_MATCH_NOTES, nextThursdayLocalYmd } from "@/lib/weekly-match-defaults";
import type { MatchFormCreateDefaults } from "@/components/admin/MatchForm";
import type { PlayerRow } from "@/lib/types";

function parseCreateDefaults(sp: URLSearchParams): MatchFormCreateDefaults | null {
  if (sp.get("plantilla") !== "libero") return null;
  let fecha = sp.get("fecha")?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    fecha = nextThursdayLocalYmd();
  }
  let notes = LIBERO_MATCH_NOTES;
  const raw = sp.get("notas");
  if (raw) {
    try {
      notes = decodeURIComponent(raw);
    } catch {
      notes = LIBERO_MATCH_NOTES;
    }
  }
  return { playedAt: fecha, notes, status: "loaded" };
}

function NuevoPartidoInner() {
  const sp = useSearchParams();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const createDefaults = useMemo(() => parseCreateDefaults(sp), [sp]);

  useEffect(() => {
    void fetchPlayers(true)
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Nuevo partido</h1>
        <p className="mt-1 text-sm text-muted">
          {createDefaults
            ? "Plantilla CopaLibero: próximo jueves, 22 h, mismo lugar. Asigná Blanco o Negro, goles y resultado."
            : "Asigná Blanco o Negro a cada jugador, cargá los goles y el resultado"}
        </p>
      </header>
      <MatchForm players={players} createDefaults={createDefaults} />
    </div>
  );
}

export default function NuevoPartidoPage() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <NuevoPartidoInner />
    </Suspense>
  );
}
