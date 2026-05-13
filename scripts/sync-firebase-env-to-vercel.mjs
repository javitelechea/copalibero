/**
 * Sube las variables NEXT_PUBLIC_FIREBASE_* de .env.local al entorno Production de Vercel.
 *
 * Requisitos: npx vercel login && npx vercel link (en esta carpeta)
 * Uso: npm run vercel:sync-firebase-env
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function parseEnv(content) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function main() {
  if (!existsSync(envPath)) {
    console.error("No existe .env.local en", envPath);
    process.exit(1);
  }
  const env = parseEnv(readFileSync(envPath, "utf8"));
  const keys = Object.keys(env).filter((k) => k.startsWith("NEXT_PUBLIC_FIREBASE_"));
  if (keys.length === 0) {
    console.error("No hay NEXT_PUBLIC_FIREBASE_* en .env.local");
    process.exit(1);
  }

  for (const key of keys.sort()) {
    const value = env[key];
    if (!value) {
      console.warn("Omitiendo", key, "(vacío)");
      continue;
    }
    console.log("→", key, "→ Vercel production");
    const r = spawnSync("npx", ["vercel", "env", "add", key, "production", "--force", "--yes"], {
      cwd: root,
      input: `${value}\n`,
      encoding: "utf-8",
      stdio: ["pipe", "inherit", "inherit"],
    });
    if (r.status !== 0) {
      console.error(
        "Falló vercel env add para",
        key,
        "— ¿corriste `npx vercel login` y `npx vercel link` en esta carpeta?"
      );
      process.exit(r.status ?? 1);
    }
  }

  console.log("\nListo. En Vercel abrí Deployments → … → Redeploy (o un push vacío).");
}

main();
