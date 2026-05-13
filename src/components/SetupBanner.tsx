import Link from "next/link";

export function SetupBanner() {
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <p className="font-medium">Falta configurar Firebase</p>
      <p className="mt-1 text-muted">
        Copiá <code className="rounded bg-surface-2 px-1">.env.local.example</code> a{" "}
        <code className="rounded bg-surface-2 px-1">.env.local</code> y completá las variables{" "}
        <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_FIREBASE_*</code> del proyecto
        Firebase.
      </p>
      <p className="mt-2 text-muted">
        Para probar sin claves todavía: en <code className="rounded bg-surface-2 px-1">.env.local</code>{" "}
        agregá <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_COPALIBERO_DEMO=1</code> y
        reiniciá el servidor (<code className="rounded bg-surface-2 px-1">npm run dev</code>).
      </p>
      <p className="mt-2 text-muted">
        En Firebase: activá <strong>Authentication</strong> (email) y <strong>Firestore</strong>, y
        pegá las reglas de{" "}
        <code className="rounded bg-surface-2 px-1">firebase/firestore.rules</code>. Creá la
        colección <code className="rounded bg-surface-2 px-1">admins</code> con un documento cuyo
        ID sea el UID de tu usuario. Las fotos de jugadores se guardan en Firestore (no hace falta
        Storage).
      </p>
      <Link
        href="https://console.firebase.google.com/"
        className="mt-2 inline-block text-accent underline-offset-4 hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        Abrir Firebase Console
      </Link>
    </div>
  );
}
