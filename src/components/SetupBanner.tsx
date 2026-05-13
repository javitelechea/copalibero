"use client";

import Link from "next/link";

export function SetupBanner() {
  const onVercel = Boolean(process.env.NEXT_PUBLIC_VERCEL_URL);

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <p className="font-medium">Falta configurar Firebase</p>
      {onVercel ? (
        <p className="mt-1 text-muted">
          Estás en <strong className="text-amber-50">Vercel</strong>: las claves no van en un archivo del repo. En el proyecto →{" "}
          <strong className="text-amber-50">Settings → Environment Variables</strong> agregá las{" "}
          <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_FIREBASE_*</code> (las mismas que en la consola de
          Firebase) para <strong className="text-amber-50">Production</strong>, guardá, y hacé{" "}
          <strong className="text-amber-50">Redeploy</strong> del último deployment.
        </p>
      ) : (
        <p className="mt-1 text-muted">
          Copiá <code className="rounded bg-surface-2 px-1">.env.local.example</code> a{" "}
          <code className="rounded bg-surface-2 px-1">.env.local</code> y completá las variables{" "}
          <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_FIREBASE_*</code> del proyecto Firebase.
        </p>
      )}
      <p className="mt-2 text-muted">
        Para probar sin claves todavía:{" "}
        {onVercel ? (
          <>
            en Vercel agregá <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_COPALIBERO_DEMO</code> ={" "}
            <code className="rounded bg-surface-2 px-1">1</code> y redeploy.
          </>
        ) : (
          <>
            en <code className="rounded bg-surface-2 px-1">.env.local</code> agregá{" "}
            <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_COPALIBERO_DEMO=1</code> y reiniciá el servidor (
            <code className="rounded bg-surface-2 px-1">npm run dev</code>).
          </>
        )}
      </p>
      <p className="mt-2 text-muted">
        En Firebase: activá <strong>Authentication</strong> (email) y <strong>Firestore</strong>, y pegá las reglas
        de <code className="rounded bg-surface-2 px-1">firebase/firestore.rules</code>. Creá la colección{" "}
        <code className="rounded bg-surface-2 px-1">admins</code> con un documento cuyo ID sea el UID de tu usuario. Las
        fotos de jugadores se guardan en Firestore (no hace falta Cloud Storage ni tarjeta de facturación). Si ves{" "}
        <code className="rounded bg-surface-2 px-1">firebasestorage.app</code> en un error, no activés Storage: revisá
        la clave API en Google Cloud (restricciones) o usá modo demo con{" "}
        <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_COPALIBERO_DEMO=1</code>.
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
