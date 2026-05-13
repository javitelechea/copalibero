import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { Users, Trophy } from "lucide-react";

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Panel</h1>
          <p className="mt-1 text-sm text-muted">Gestioná jugadores y partidos</p>
        </div>
        <LogoutButton />
      </div>

      <div className="grid gap-4">
        <Link
          href="/admin/jugadores"
          className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:border-accent/40 hover:bg-surface-2"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Jugadores</p>
            <p className="text-sm text-muted">Alta, foto y estado</p>
          </div>
        </Link>
        <Link
          href="/admin/partidos"
          className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:border-accent/40 hover:bg-surface-2"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Partidos</p>
            <p className="text-sm text-muted">Resultado, equipos y goles</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
