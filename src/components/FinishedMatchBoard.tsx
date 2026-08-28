import Link from "next/link";
import { GoalBallIcons } from "@/components/GoalBallIcons";
import { comparePlayers, playerLabel } from "@/lib/player-label";
import { teamDisplayName } from "@/lib/team-labels";
import type { Team } from "@/lib/types";

type PlayerMini = {
  id: string;
  display_name: string;
  nickname?: string | null;
  avatar_url: string | null;
};

type Props = {
  scoreA: number;
  scoreB: number;
  teamA: PlayerMini[];
  teamB: PlayerMini[];
  goalsByPlayer: Map<string, number>;
  /** Gol de oro: el marcador puede ser 5–4, el resultado se muestra como empate. */
  goldenGoal?: boolean;
};

function sortByName(players: PlayerMini[]) {
  return [...players].sort(comparePlayers);
}

function TeamColumn({
  team,
  players,
  goalsByPlayer,
  align,
}: {
  team: Team;
  players: PlayerMini[];
  goalsByPlayer: Map<string, number>;
  align: "left" | "right";
}) {
  const isBlanco = team === "A";
  const sorted = sortByName(players);

  return (
    <div
      className={`flex min-w-0 flex-col ${
        isBlanco ? "border-r border-white/10 bg-white/[0.04]" : "bg-black/[0.12]"
      }`}
    >
      <ul className="flex flex-1 flex-col divide-y divide-white/5">
        {sorted.length === 0 ? (
          <li className="px-3 py-6 text-center text-xs text-muted">Sin jugadores</li>
        ) : (
          sorted.map((p) => {
            const goals = goalsByPlayer.get(p.id) ?? 0;
            return (
              <li key={p.id}>
                <Link
                  href={`/jugadores/${p.id}`}
                  className={`flex items-center gap-1.5 px-2.5 py-2 transition hover:bg-white/5 sm:px-3 ${
                    align === "right" ? "flex-row-reverse text-right" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium leading-snug sm:text-[0.8125rem]">
                    {playerLabel(p)}
                  </span>
                  <GoalBallIcons count={goals} />
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

export function FinishedMatchBoard({
  scoreA,
  scoreB,
  teamA,
  teamB,
  goalsByPlayer,
  goldenGoal = false,
}: Props) {
  const blancoWins = !goldenGoal && scoreA > scoreB;
  const negroWins = !goldenGoal && scoreB > scoreA;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-[#1a2744] via-surface-2 to-surface shadow-[var(--shadow-glow)]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 border-b border-white/10 px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
        <p
          className={`text-end text-sm font-black uppercase tracking-wide sm:text-base ${
            blancoWins ? "text-fg" : "text-muted"
          }`}
        >
          {teamDisplayName("A")}
        </p>
        <div className="flex items-center justify-center gap-2 px-2 sm:gap-3">
          <span
            className={`font-mono text-4xl font-black tabular-nums sm:text-5xl ${
              blancoWins ? "text-accent" : "text-fg/80"
            }`}
          >
            {scoreA}
          </span>
          <span className="text-xl font-light text-muted/80 sm:text-2xl">—</span>
          <span
            className={`font-mono text-4xl font-black tabular-nums sm:text-5xl ${
              negroWins ? "text-emerald-400" : "text-fg/80"
            }`}
          >
            {scoreB}
          </span>
        </div>
        <p
          className={`text-start text-sm font-black uppercase tracking-wide sm:text-base ${
            negroWins ? "text-fg" : "text-muted"
          }`}
        >
          {teamDisplayName("B")}
        </p>
        {goldenGoal ? (
          <p className="col-span-3 mt-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">
            Empate · gol de oro
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2">
        <TeamColumn team="A" players={teamA} goalsByPlayer={goalsByPlayer} align="left" />
        <TeamColumn team="B" players={teamB} goalsByPlayer={goalsByPlayer} align="right" />
      </div>
    </section>
  );
}
