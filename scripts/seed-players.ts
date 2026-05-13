/**
 * Carga en Firestore los jugadores de la plantilla (src/lib/first-match-roster.ts).
 * No borra nada: si ya existe un doc con el mismo display_name, lo saltea.
 *
 * Requisitos:
 * 1. En Firebase Console → Ajustes del proyecto → Cuentas de servicio → "Generar nueva clave privada".
 * 2. Guardá el JSON como `firebase-service-account.local.json` en la raíz de `copalibero`
 *    (está en .gitignore) O exportá GOOGLE_APPLICATION_CREDENTIALS.
 * 3. npm run seed:players
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { FIRST_MATCH_ROSTER_NAMES } from "../src/lib/first-match-roster";

/** Archivo local (gitignored) para no exportar variables cada vez. */
const LOCAL_SERVICE_ACCOUNT = join(process.cwd(), "firebase-service-account.local.json");

function initAdmin() {
  if (getApps().length > 0) return;

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (inline) {
    initializeApp({ credential: cert(JSON.parse(inline) as Record<string, unknown>) });
    return;
  }
  if (path) {
    const raw = readFileSync(path, "utf8");
    initializeApp({ credential: cert(JSON.parse(raw) as Record<string, unknown>) });
    return;
  }
  if (existsSync(LOCAL_SERVICE_ACCOUNT)) {
    const raw = readFileSync(LOCAL_SERVICE_ACCOUNT, "utf8");
    initializeApp({ credential: cert(JSON.parse(raw) as Record<string, unknown>) });
    return;
  }

  console.error(`
No encontré credenciales de administrador.

Opción A — archivo en la raíz del proyecto (gitignored):
  Guardá la clave privada como:
  ${LOCAL_SERVICE_ACCOUNT}

Opción B — variable de entorno:
  export GOOGLE_APPLICATION_CREDENTIALS="/ruta/completa/al-adminsdk.json"

Opción C — JSON en una línea:
  export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

Luego: npm run seed:players
`);
  process.exit(1);
}

async function main() {
  initAdmin();
  const db = getFirestore();

  let created = 0;
  let skipped = 0;

  for (const display_name of FIRST_MATCH_ROSTER_NAMES) {
    const snap = await db.collection("players").where("display_name", "==", display_name).limit(1).get();
    if (!snap.empty) {
      skipped += 1;
      console.log(`[skip] ya existe: ${display_name}`);
      continue;
    }
    await db.collection("players").add({
      display_name,
      active: true,
      created_at: FieldValue.serverTimestamp(),
    });
    created += 1;
    console.log(`[ok]   creado: ${display_name}`);
  }

  console.log(`\nListo. Creados: ${created}, ya existían: ${skipped}, total plantilla: ${FIRST_MATCH_ROSTER_NAMES.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
