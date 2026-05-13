"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopaLiberoLogo } from "@/components/CopaLiberoLogo";
import { SetupBanner } from "@/components/SetupBanner";
import { LoginForm } from "@/components/admin/LoginForm";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured, isOfflineDemoData } from "@/lib/env";
import { isUserAdmin } from "@/lib/firestore-queries";

export default function AdminLoginPage() {
  const router = useRouter();
  const configured = isFirebaseConfigured();
  const offlineDemo = isOfflineDemoData();
  const [checking, setChecking] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    try {
      const auth = getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, async (user) => {
        if (user && (await isUserAdmin(user.uid))) {
          router.replace("/admin");
          return;
        }
        setChecking(false);
      });
      return () => unsub();
    } catch {
      queueMicrotask(() => setChecking(false));
    }
  }, [configured, router]);

  if (offlineDemo) {
    return (
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <CopaLiberoLogo className="h-20 w-20" priority />
        </div>
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-accent hover:underline"
        >
          ← Volver al torneo
        </Link>
        <div className="rounded-2xl border border-border bg-surface px-5 py-6 text-sm text-muted">
          <p className="font-medium text-fg">Estás en modo demo</p>
          <p className="mt-2">
            La web pública ya muestra tabla, partidos y jugadores de ejemplo. El panel admin necesita
            Firebase: copiá <code className="rounded bg-surface-2 px-1">.env.local.example</code> a{" "}
            <code className="rounded bg-surface-2 px-1">.env.local</code>, completá las claves y
            quitá{" "}
            <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_COPALIBERO_DEMO=1</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <CopaLiberoLogo className="h-20 w-20" priority />
        </div>
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-accent hover:underline"
        >
          ← Volver al torneo
        </Link>
        <SetupBanner />
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted">Cargando…</div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <CopaLiberoLogo className="h-20 w-20" priority />
      </div>
      <Link
        href="/"
        className="mb-8 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Volver al torneo
      </Link>
      <div className="rounded-3xl border border-border bg-surface p-8 shadow-[var(--shadow-glow)]">
        <h1 className="text-center text-xl font-bold">Administración</h1>
        <p className="mt-1 text-center text-sm text-muted">Ingresá con tu cuenta de administrador</p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
