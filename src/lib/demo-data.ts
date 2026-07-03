import { FIRST_MATCH_ROSTER } from "@/lib/first-match-roster";
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

/** Invitados puntuales (aparecen en partidos y tabla si jugaron). */
const DEMO_GUEST_PLAYERS: PlayerRow[] = [
  { id: "demo-g-gasti", display_name: "Gasti (invitado)", nickname: "Gasti", avatar_url: null, active: true, created_at: t },
  {
    id: "demo-g-agusgasti",
    display_name: "Agus Gasti (invitado)",
    nickname: "Agus Gasti",
    avatar_url: null,
    active: true,
    created_at: t,
  },
  { id: "demo-g-bocon", display_name: "bocón (invitado)", nickname: "bocón", avatar_url: null, active: true, created_at: t },
];

export const DEMO_PLAYERS: PlayerRow[] = [
  ...FIRST_MATCH_ROSTER.map(({ display_name, nickname }, i) => ({
    id: `demo-p${i + 1}`,
    display_name,
    nickname,
    avatar_url: null,
    active: true,
    created_at: t,
  })),
  ...DEMO_GUEST_PLAYERS,
];

/** IDs de plantilla (demo-pN) para armar nóminas demo. */
const P = {
  marian: "demo-p1",
  mosca: "demo-p4",
  colo: "demo-p5",
  topo: "demo-p7",
  tanque: "demo-p9",
  plasty: "demo-p10",
  pety: "demo-p12",
  campa: "demo-p13",
  javi: "demo-p15",
  andy: "demo-p16",
  hongo: "demo-p17",
  gasti: "demo-g-gasti",
  agusGasti: "demo-g-agusgasti",
  bocon: "demo-g-bocon",
} as const;

const MATCH_JUL02 = "demo-m-jul02";

export const DEMO_MATCHES: MatchRow[] = [
  {
    id: MATCH_JUL02,
    played_at: "2026-07-02",
    team_a_score: 10,
    team_b_score: 9,
    status: "played",
    notes: LIBERO_MATCH_NOTES,
    created_at: t,
  },
  {
    id: "demo-m1",
    played_at: "2026-05-14",
    team_a_score: 0,
    team_b_score: 0,
    status: "loaded",
    notes: LIBERO_MATCH_NOTES,
    created_at: t,
  },
];

export const DEMO_LINEUPS: MatchPlayerRow[] = [
  // Jueves 2/7/2026 — Blanco 10 vs Negro 9
  { match_id: MATCH_JUL02, player_id: P.campa, team: "A" },
  { match_id: MATCH_JUL02, player_id: P.mosca, team: "A" },
  { match_id: MATCH_JUL02, player_id: P.bocon, team: "A" },
  { match_id: MATCH_JUL02, player_id: P.tanque, team: "A" },
  { match_id: MATCH_JUL02, player_id: P.pety, team: "A" },
  { match_id: MATCH_JUL02, player_id: P.colo, team: "A" },
  { match_id: MATCH_JUL02, player_id: P.hongo, team: "A" },
  { match_id: MATCH_JUL02, player_id: P.javi, team: "B" },
  { match_id: MATCH_JUL02, player_id: P.gasti, team: "B" },
  { match_id: MATCH_JUL02, player_id: P.plasty, team: "B" },
  { match_id: MATCH_JUL02, player_id: P.andy, team: "B" },
  { match_id: MATCH_JUL02, player_id: P.marian, team: "B" },
  { match_id: MATCH_JUL02, player_id: P.agusGasti, team: "B" },
  { match_id: MATCH_JUL02, player_id: P.topo, team: "B" },
  // Próxima fecha programada
  { match_id: "demo-m1", player_id: "demo-p1", team: "pool" },
  { match_id: "demo-m1", player_id: "demo-p2", team: "pool" },
  { match_id: "demo-m1", player_id: "demo-p3", team: "pool" },
];

export const DEMO_GOALS: MatchGoalRow[] = [
  { id: "demo-gol-jul02-1", match_id: MATCH_JUL02, player_id: P.campa, goals: 2 },
  { id: "demo-gol-jul02-2", match_id: MATCH_JUL02, player_id: P.mosca, goals: 2 },
  { id: "demo-gol-jul02-3", match_id: MATCH_JUL02, player_id: P.bocon, goals: 1 },
  { id: "demo-gol-jul02-4", match_id: MATCH_JUL02, player_id: P.tanque, goals: 5 },
  { id: "demo-gol-jul02-5", match_id: MATCH_JUL02, player_id: P.javi, goals: 2 },
  { id: "demo-gol-jul02-6", match_id: MATCH_JUL02, player_id: P.gasti, goals: 1 },
  { id: "demo-gol-jul02-7", match_id: MATCH_JUL02, player_id: P.plasty, goals: 1 },
  { id: "demo-gol-jul02-8", match_id: MATCH_JUL02, player_id: P.andy, goals: 5 },
];

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
    DEMO_PLAYERS.map((p) => [
      p.id,
      { id: p.id, display_name: p.display_name, nickname: p.nickname, avatar_url: p.avatar_url },
    ])
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
