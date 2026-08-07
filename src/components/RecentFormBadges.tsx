import type { TeamMatchResult } from "@/lib/match-outcome";

const LABEL: Record<TeamMatchResult, string> = {
  win: "V",
  draw: "E",
  loss: "D",
};

const TONE: Record<TeamMatchResult, string> = {
  win: "bg-emerald-600 text-white",
  draw: "bg-amber-500 text-white",
  loss: "bg-red-600 text-white",
};

type Props = {
  form: TeamMatchResult[];
  /** En móvil se muestran menos para no ensanchar la tabla. */
  mobileCount?: number;
  desktopCount?: number;
};

/** Pastillas V/E/D de los últimos partidos (derecha = más reciente). */
export function RecentFormBadges({ form, mobileCount = 3, desktopCount = 5 }: Props) {
  if (form.length === 0) {
    return <span className="text-muted">—</span>;
  }

  const mobile = form.slice(-mobileCount);
  const desktop = form.slice(-desktopCount);
  const olderOnDesktop = desktop.slice(0, Math.max(0, desktop.length - mobile.length));
  const shared = desktop.slice(olderOnDesktop.length);

  return (
    <span className="inline-flex items-center justify-center gap-px" title="Últimos resultados">
      {olderOnDesktop.map((r, i) => (
        <span
          key={`older-${i}`}
          className={`hidden h-3.5 w-3.5 items-center justify-center rounded-[2px] text-[7px] font-black leading-none sm:inline-flex ${TONE[r]}`}
        >
          {LABEL[r]}
        </span>
      ))}
      {shared.map((r, i) => (
        <span
          key={`recent-${i}`}
          className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-[2px] text-[7px] font-black leading-none ${TONE[r]}`}
        >
          {LABEL[r]}
        </span>
      ))}
    </span>
  );
}
