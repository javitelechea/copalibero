export type Team = "A" | "B";

/** En cancha (A/B) o convocado sin equipo todavía (`pool`). */
export type MatchRosterRole = Team | "pool";

export type ConfirmationStatus = "confirmed" | "maybe" | "declined";

export type MatchStatus = "scheduled" | "played";

export type PlayerRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
};

export type MatchRow = {
  id: string;
  played_at: string;
  team_a_score: number;
  team_b_score: number;
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
    players: Pick<PlayerRow, "id" | "display_name" | "avatar_url"> | null;
  }[];
  match_goals: { id: string; player_id: string; goals: number }[];
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
};
