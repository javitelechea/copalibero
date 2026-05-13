import Link from "next/link";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { CopaLiberoLogo } from "@/components/CopaLiberoLogo";
import { D1LogoutButton } from "@/components/admin/D1LogoutButton";

export default function SecureAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGate>
      <div className="min-h-dvh bg-canvas pb-16">
        <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-accent">
              <CopaLiberoLogo className="h-9 w-9" />
              <span>Admin</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
              <Link href="/admin/jugadores" className="text-muted hover:text-fg">
                Jugadores
              </Link>
              <Link href="/admin/partidos" className="text-muted hover:text-fg">
                Partidos
              </Link>
              <Link href="/" className="text-muted hover:text-fg">
                Ver web
              </Link>
              <D1LogoutButton />
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-lg px-4 pt-6">{children}</div>
      </div>
    </AdminAuthGate>
  );
}
