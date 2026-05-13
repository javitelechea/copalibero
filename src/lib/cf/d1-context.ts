import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

export function getD1(): D1Database {
  const { env } = getCloudflareContext();
  if (!env.DB) {
    throw new Error("Binding D1 (DB) no encontrado. Revisá wrangler.jsonc y wrangler d1 migrations apply.");
  }
  return env.DB;
}

export function getSessionSecret(): string {
  const { env } = getCloudflareContext();
  const s = env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("Definí SESSION_SECRET (≥16 caracteres) en secrets de Cloudflare o .dev.vars");
  }
  return s;
}
