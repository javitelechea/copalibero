import type { MatchStatus } from "@/lib/types";

export function normalizeMatchStatus(raw: unknown): MatchStatus {
  if (raw === "scheduled") return "scheduled";
  if (raw === "loaded") return "loaded";
  return "played";
}

export function matchStatusLabel(status: MatchStatus): string {
  switch (status) {
    case "scheduled":
      return "Programado";
    case "loaded":
      return "Cargado";
    case "played":
      return "Finalizado";
  }
}

export function isMatchFinalized(status: MatchStatus): boolean {
  return status === "played";
}

export function isMatchUpcoming(status: MatchStatus): boolean {
  return status === "scheduled" || status === "loaded";
}

export function showsMatchScore(status: MatchStatus): boolean {
  return status === "played";
}
