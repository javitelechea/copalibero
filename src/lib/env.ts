/** Build `npm run build:static`: sitio 100% demo, sin API ni Firebase en el bundle público. */
export function isStaticExportBuild(): boolean {
  return process.env.NEXT_PUBLIC_COPALIBERO_STATIC_EXPORT === "1";
}

/** Firebase listo para Auth + Firestore (producción). */
export function isFirebaseConfigured(): boolean {
  if (isStaticExportBuild()) return false;
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}

/** `NEXT_PUBLIC_COPALIBERO_DEMO=1` → datos de ejemplo sin backend. */
export function isDemoMode(): boolean {
  if (isStaticExportBuild()) return true;
  return process.env.NEXT_PUBLIC_COPALIBERO_DEMO === "1";
}

/** `NEXT_PUBLIC_COPALIBERO_BACKEND=d1` → datos y admin vía API + D1 en Cloudflare (sin Firebase). */
export function isD1Backend(): boolean {
  if (isStaticExportBuild()) return false;
  return process.env.NEXT_PUBLIC_COPALIBERO_BACKEND === "d1";
}

/** Panel admin: Firebase Auth o sesión D1. */
export function isAdminBackendConfigured(): boolean {
  return isFirebaseConfigured() || isD1Backend();
}

/** Podés ver tabla, partidos y jugadores (Firebase, D1 o demo). */
export function canUsePublicApp(): boolean {
  return isFirebaseConfigured() || isDemoMode() || isD1Backend();
}

/** Demo sin claves: solo lectura pública; el admin necesita Firebase o D1. */
export function isOfflineDemoData(): boolean {
  return isDemoMode() && !isFirebaseConfigured() && !isD1Backend();
}
