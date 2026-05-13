import type { D1Database } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    SESSION_SECRET: string;
  }
}

export {};
