"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MatchForm } from "@/components/admin/MatchForm";
import { fetchMatchById, fetchPlayers } from "@/lib/firestore-queries";
import type { MatchWithDetails, PlayerRow } from "@/lib/types";

export default function EditarPartidoPage() {
  const params = useParams();
  const id = params.id as string;
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [match, setMatch] = useState<MatchWithDetails | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    void Promise.all([fetchPlayers(true), fetchMatchById(id)]).then(([p, m]) => {
      setPlayers(p);
      setMatch(m);
    });
  }, [id]);

  if (match === undefined) {
    return <p className="text-muted">Cargando…</p>;
  }
  if (match === null) {
    return <p className="text-muted">Partido no encontrado.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Editar partido</h1>
        <p className="mt-1 text-sm text-muted">Actualizá equipos y marcador</p>
      </header>
      <MatchForm key={match.id} players={players} initialMatch={match} />
    </div>
  );
}
