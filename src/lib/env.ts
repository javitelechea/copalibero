/** Firebase listo para Auth + Firestore (producción). */
export function isFirebaseConfigured(): boolean {
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
  return process.env.NEXT_PUBLIC_COPALIBERO_DEMO === "1";
}

/** Podés ver tabla, partidos y jugadores (Firebase real o demo). */
export function canUsePublicApp(): boolean {
  return isFirebaseConfigured() || isDemoMode();
}

/** Demo sin claves: solo lectura pública; el admin pide Firebase. */
export function isOfflineDemoData(): boolean {
  return isDemoMode() && !isFirebaseConfigured();
}
