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
  /** Opcional: menor = prioridad en borrador si empata con la tabla (p. ej. nunca jugó). */
  draft_seed?: number | null;
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

export type AsadoRow = {
  id: string;
  held_at: string;
  notes: string | null;
  /** Costo total en pesos (opcional; sirve para la calculadora compartida). */
  total_cost: number | null;
  created_at: string;
};

export type AsadoAttendeeRow = {
  id: string;
  asado_id: string;
  player_id: string;
  /** Cuántas veces / porciones de asado comió (número entero ≥ 0). */
  portions: number;
  /** Si se quedó al asado (entra en el reparto del costo). */
  stayed: boolean;
  /** Si compró carne (u otro insumo) para ese día de asado. */
  bought_meat: boolean;
};

export type AsadoAttendeeWithPlayer = AsadoAttendeeRow & {
  player: Pick<PlayerRow, "id" | "display_name" | "avatar_url"> | null;
};
