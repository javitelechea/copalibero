import { FIRST_MATCH_ROSTER_NAMES } from "@/lib/first-match-roster";
import { LIBERO_MATCH_NOTES } from "@/lib/weekly-match-defaults";
import type {
  AsadoAttendeeRow,
  AsadoRow,
  MatchConfirmationRow,
  MatchGoalRow,
  MatchPlayerRow,
  MatchRow,
  MatchWithDetails,
  PlayerRow,
} from "@/lib/types";

const t = "2026-01-01T12:00:00.000Z";

export const DEMO_PLAYERS: PlayerRow[] = FIRST_MATCH_ROSTER_NAMES.map((display_name, i) => ({
  id: `demo-p${i + 1}`,
  display_name,
  avatar_url: null,
  active: true,
  created_at: t,
}));

/** Primera fecha programada; sin nómina hasta que armes equipos en admin. */
export const DEMO_MATCHES: MatchRow[] = [
  {
    id: "demo-m1",
    played_at: "2026-05-14",
    team_a_score: 0,
    team_b_score: 0,
    status: "scheduled",
    notes: LIBERO_MATCH_NOTES,
    created_at: t,
  },
];

/** Convocados de ejemplo para la fecha programada demo. */
export const DEMO_LINEUPS: MatchPlayerRow[] = [
  { match_id: "demo-m1", player_id: "demo-p1", team: "pool" },
  { match_id: "demo-m1", player_id: "demo-p2", team: "pool" },
  { match_id: "demo-m1", player_id: "demo-p3", team: "pool" },
];

export const DEMO_GOALS: MatchGoalRow[] = [];

export const DEMO_CONFIRMATIONS: MatchConfirmationRow[] = [];

export const DEMO_ASADOS: AsadoRow[] = [
  {
    id: "demo-asado1",
    held_at: "2026-05-10",
    notes: "Después del partido",
    total_cost: 120_000,
    created_at: t,
  },
];

export const DEMO_ASADO_ATTENDEES: AsadoAttendeeRow[] = [
  {
    id: "demo-ap1",
    asado_id: "demo-asado1",
    player_id: "demo-p1",
    portions: 2,
    stayed: true,
    bought_meat: true,
    panificado: false,
    postre: true,
  },
  {
    id: "demo-ap2",
    asado_id: "demo-asado1",
    player_id: "demo-p2",
    portions: 1,
    stayed: true,
    bought_meat: false,
    panificado: true,
    postre: false,
  },
  {
    id: "demo-ap3",
    asado_id: "demo-asado1",
    player_id: "demo-p3",
    portions: 1,
    stayed: false,
    bought_meat: true,
    panificado: false,
    postre: false,
  },
];

export function demoMatchById(matchId: string): MatchWithDetails | null {
  const match = DEMO_MATCHES.find((m) => m.id === matchId);
  if (!match) return null;
  const rows = DEMO_LINEUPS.filter((l) => l.match_id === matchId);
  const mini = new Map(
    DEMO_PLAYERS.map((p) => [p.id, { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url }])
  );
  const match_players = rows.map((r) => ({
    team: r.team,
    players: mini.get(r.player_id) ?? null,
  }));
  const match_goals = DEMO_GOALS.filter((g) => g.match_id === matchId).map((g) => ({
    id: g.id,
    player_id: g.player_id,
    goals: g.goals,
  }));
  return { ...match, match_players, match_goals };
}
