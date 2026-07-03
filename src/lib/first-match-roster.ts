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
] as const;

export const FIRST_MATCH_ROSTER_NAMES = FIRST_MATCH_ROSTER.map((p) => p.display_name);

export function firstMatchRosterPasteText(): string {
  return FIRST_MATCH_ROSTER_NAMES.join("\n");
}
