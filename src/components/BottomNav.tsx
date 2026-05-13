"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shield, Trophy, Users } from "lucide-react";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/partidos", label: "Partidos", icon: Trophy },
  { href: "/jugadores", label: "Jugadores", icon: Users },
  { href: "/admin", label: "Admin", icon: Shield },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "text-accent"
                  : "text-muted hover:text-fg"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${active ? "drop-shadow-[var(--shadow-glow)]" : ""}`}
                strokeWidth={active ? 2.25 : 1.75}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
