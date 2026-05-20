/**
 * Da permiso de admin en Firestore (colección `admins/{uid}`).
 *
 * Uso:
 *   npm run grant:admin -- mosca@copalibero.local Mosca2026
 *   npm run grant:admin -- iorgo@copalibero.local IorgoCopa
 *
 * Mismas credenciales que seed:players (firebase-service-account.local.json).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

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
No encontré credenciales de administrador de Firebase.

Guardá la clave de cuenta de servicio como:
  ${LOCAL_SERVICE_ACCOUNT}

Luego: npm run grant:admin -- mosca@copalibero.local Mosca2026
`);
  process.exit(1);
}

function loginEmail(raw: string): string {
  const u = raw.trim().toLowerCase();
  if (!u) return u;
  if (u.includes("@")) return u;
  return `${u}@copalibero.local`;
}

async function ensureAuthUser(email: string, password: string) {
  const auth = getAuth();
  try {
    return await auth.getUserByEmail(email);
  } catch {
    return await auth.createUser({ email, password });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Uso: npm run grant:admin -- <usuario-o-mail> <contraseña>");
    console.error("Ej: npm run grant:admin -- mosca Mosca2026");
    process.exit(1);
  }

  const email = loginEmail(args[0]);
  const password = args[1];
  initAdmin();

  const user = await ensureAuthUser(email, password);
  const db = getFirestore();
  await db.collection("admins").doc(user.uid).set(
    {
      email: user.email ?? email,
      granted_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`[ok] Admin: ${email}`);
  console.log(`     UID (por si lo necesitás en consola): ${user.uid}`);
  console.log(`     Documento: admins/${user.uid}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
