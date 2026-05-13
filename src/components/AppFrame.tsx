import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { CopaLiberoLogo } from "@/components/CopaLiberoLogo";

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-lg items-center justify-between gap-2 px-4 pt-3 pb-1">
        <Link
          href="/admin"
          className="shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted transition hover:bg-surface-2 hover:text-accent"
        >
          Admin
        </Link>
        <Link
          href="/"
          className="rounded-2xl p-1 ring-offset-2 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="CopaLibero — inicio"
        >
          <CopaLiberoLogo className="h-16 w-16" priority />
        </Link>
        <span className="w-[52px] shrink-0" aria-hidden />
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-28 pt-1">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
