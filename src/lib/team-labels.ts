import type { Team } from "@/lib/types";

/** A = Blanco, B = Negro (siempre estos nombres en la UI). */
export function teamDisplayName(team: Team): string {
  return team === "A" ? "Blanco" : "Negro";
}

export function otherTeam(team: Team): Team {
  return team === "A" ? "B" : "A";
}
