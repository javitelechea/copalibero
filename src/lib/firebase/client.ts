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
  // No seteamos storageBucket: esta app no usa firebase/storage. Un valor mal
  // copiado (p. ej. la URL *.firebasestorage.app) provoca "Permission denied"
  // en llamadas que validan el bucket por defecto.
  if (!config.apiKey || !config.projectId) {
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
    return "Ese mensaje viene de Google Cloud (recurso Storage del proyecto), no de tus reglas de Firestore. No hace falta activar Storage ni tarjeta. Hacé esto en orden: (1) Google Cloud Console → APIs y servicios → Credenciales → abrí la misma clave que usás en NEXT_PUBLIC_FIREBASE_API_KEY. (2) Restricciones de API → elegí “No restringir” o asegurate de incluir “Cloud Firestore API”, “Identity Toolkit API” y “Token Service API”. (3) Restricciones de aplicación → agregá el origen exacto de tu web (p. ej. https://copalibero.javitelechea.workers.dev y http://localhost:3000) o “Ninguna” solo para probar. Guardá, esperá 2–5 minutos y recargá. Si querés publicar sin Firebase: en Cloudflare poné solo NEXT_PUBLIC_COPALIBERO_DEMO=1 y sin las demás NEXT_PUBLIC_FIREBASE_*.";
  }
  if (m.includes("permission-denied") || m.includes("permission denied")) {
    return "Si el mensaje no menciona Storage, revisá firestore.rules (lectura pública en colecciones que usa la app) y que la API key no esté restringida de más en Google Cloud.";
  }
  return null;
}
