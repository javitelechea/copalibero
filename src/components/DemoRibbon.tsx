"use client";

import { isOfflineDemoData, isStaticExportBuild } from "@/lib/env";

/** Aviso solo en desarrollo / hosting con variables demo; la build estática publicada no muestra cinta (datos ya van embebidos). */
export function DemoRibbon() {
  if (isStaticExportBuild()) return null;
  if (!isOfflineDemoData()) return null;
  return (
    <div className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-center text-xs text-muted">
      <strong className="text-accent">Modo demo</strong> — datos de ejemplo. Cuando conectes Firebase, quitá{" "}
      <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_COPALIBERO_DEMO=1</code> del entorno (por ejemplo{" "}
      <code className="rounded bg-surface-2 px-1">.env.local</code> en tu máquina o las variables del hosting).
    </div>
  );
}
