"use client";

import { isOfflineDemoData } from "@/lib/env";

export function DemoRibbon() {
  if (!isOfflineDemoData()) return null;
  return (
    <div className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-center text-xs text-muted">
      <strong className="text-accent">Modo demo</strong> — datos de ejemplo. Cuando conectes Firebase,
      borrá <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_COPALIBERO_DEMO=1</code> del{" "}
      <code className="rounded bg-surface-2 px-1">.env.local</code>.
    </div>
  );
}
