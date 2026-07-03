/** Convocados para la primera fecha (equipos A/B se arman después en admin). */
export const FIRST_MATCH_ROSTER = [
  { display_name: "Mariano San Juan", nickname: "marian" },
  { display_name: "Juan Jose Vazquez", nickname: "JJ" },
  { display_name: "Alejandro Rodriguez", nickname: "Ale" },
  { display_name: "Rodrigo Coll", nickname: "Mosca" },
  { display_name: "Fernando Citara", nickname: "Colo" },
  { display_name: "Franco Bonatti", nickname: "Pity" },
  { display_name: "Martin Casanova", nickname: "Topo" },
  { display_name: "Nicolas Chiusarolo", nickname: "Chusa" },
  { display_name: "Fabian Almada", nickname: "Tanque" },
  { display_name: "Marcos Linayo", nickname: "Plasty" },
  { display_name: "Jorge Dascolias", nickname: "Iorgo" },
  { display_name: "Federico Cortes", nickname: "Pety" },
  { display_name: "Rodrigo Campaño", nickname: "Campa" },
  { display_name: "Juan Dascolias", nickname: "Kimi" },
  { display_name: "Javi", nickname: "Javi" },
  { display_name: "Andy", nickname: "Andy" },
  { display_name: "Hongo", nickname: "Hongo" },
] as const;

export const FIRST_MATCH_ROSTER_NAMES = FIRST_MATCH_ROSTER.map((p) => p.display_name);

const NICKNAME_BY_DISPLAY_NAME = new Map(
  FIRST_MATCH_ROSTER.map((p) => [p.display_name.trim().toLowerCase(), p.nickname])
);

/** Apodo por defecto según plantilla (si en la DB falta `nickname`). */
export function defaultNicknameForDisplayName(displayName: string): string | null {
  return NICKNAME_BY_DISPLAY_NAME.get(displayName.trim().toLowerCase()) ?? null;
}

export function firstMatchRosterPasteText(): string {
  return FIRST_MATCH_ROSTER_NAMES.join("\n");
}
