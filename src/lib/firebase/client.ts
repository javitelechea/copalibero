import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore/lite";

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const config: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const projectId = config.projectId;
  const bucketOverride = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  // Proyectos nuevos en Spark: Firestore a veces devuelve PERMISSION_DENIED sobre
  // `PROJECT.firebasestorage.app` si el SDK no fija bucket. Forzamos el nombre clásico
  // `*.appspot.com` salvo override explícito (consola Firebase → tu bucket real).
  if (projectId) {
    config.storageBucket = bucketOverride || `${projectId}.appspot.com`;
  }
  if (!config.apiKey || !projectId) {
    throw new Error("Firebase no está configurado (faltan variables NEXT_PUBLIC_FIREBASE_*)");
  }
  app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function getFirestoreDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/** Texto extra para errores típicos del cliente (UI). */
export function firebaseErrorUserHint(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes("firebasestorage.app") || m.includes("firebase storage")) {
    return "Si sigue apareciendo firebasestorage.app: en Cloudflare no pongas NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET con esa URL; la app ya usa por defecto proyecto.appspot.com. Revisá la clave API (sin restricciones para probar). Si nada ayuda: Blaze (puede quedar en $0 sin usar Storage) o NEXT_PUBLIC_COPALIBERO_DEMO=1 sin Firebase.";
  }
  if (m.includes("permission-denied") || m.includes("permission denied")) {
    return "Si el mensaje no menciona Storage, revisá firestore.rules (lectura pública en colecciones que usa la app) y que la API key no esté restringida de más en Google Cloud.";
  }
  return null;
}
