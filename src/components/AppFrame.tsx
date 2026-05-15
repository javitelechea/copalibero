import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { CopaLiberoLogo } from "@/components/CopaLiberoLogo";

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 pt-3 pb-1">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-1 pr-2 ring-offset-2 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Copa Libero 2026 — inicio"
        >
          <CopaLiberoLogo className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" priority />
          <span className="min-w-0 text-left font-bold leading-tight tracking-tight text-fg">
            <span className="block text-lg sm:text-xl">Copa Libero</span>
            <span className="block text-base text-accent sm:text-lg">2026</span>
          </span>
        </Link>
      </header>
      <main className="mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col px-4 pb-28 pt-1">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
