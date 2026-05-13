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
    return "Eso es Firebase Storage, no reglas de Firestore. En Cloudflare y en .env.local: borrá NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (esta app no lo necesita) o poné exactamente el bucket que muestra Firebase → ⚙️ Configuración del proyecto (suele ser proyecto.appspot.com, no la URL). En la consola, abrí Storage y completá el asistente del bucket por defecto si aparece.";
  }
  if (m.includes("permission-denied") || m.includes("permission denied")) {
    return "Si el mensaje no menciona Storage, revisá firestore.rules (lectura pública en colecciones que usa la app) y que la API key no esté restringida de más en Google Cloud.";
  }
  return null;
}
