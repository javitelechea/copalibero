export type Team = "A" | "B";

/** En cancha (A/B) o convocado sin equipo todavía (`pool`). */
export type MatchRosterRole = Team | "pool";

export type ConfirmationStatus = "confirmed" | "maybe" | "declined";

export type MatchStatus = "scheduled" | "loaded" | "teams" | "played";

export type PlayerRow = {
  id: string;
  display_name: string;
  /** Apodo visible en la app (tabla, partidos, etc.). */
  nickname: string | null;
  avatar_url: string | null;
  active: boolean;
  /** Invitado puntual: puede jugar partidos pero no aparece en la tabla general. */
  guest: boolean;
  created_at: string;
  /** Opcional: menor = prioridad en borrador si empata con la tabla (p. ej. nunca jugó). */
  draft_seed?: number | null;
};

export type MatchRow = {
  id: string;
  played_at: string;
  team_a_score: number;
  team_b_score: number;
  /** Si el partido se definió por gol de oro con marcador empatado. */
  golden_goal_winner: Team | null;
  status: MatchStatus;
  notes: string | null;
  created_at: string;
};

export type MatchPlayerRow = {
  match_id: string;
  player_id: string;
  team: MatchRosterRole;
};

export type MatchGoalRow = {
  id: string;
  match_id: string;
  player_id: string;
  goals: number;
};

export type MatchConfirmationRow = {
  match_id: string;
  player_id: string;
  status: ConfirmationStatus;
  updated_at: string;
};

export type MatchWithDetails = MatchRow & {
  match_players: {
    team: MatchRosterRole;
    players: Pick<PlayerRow, "id" | "display_name" | "nickname" | "avatar_url"> | null;
  }[];
  match_goals: { id: string; player_id: string; goals: number }[];
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
};
