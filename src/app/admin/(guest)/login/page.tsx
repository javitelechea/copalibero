"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopaLiberoLogo } from "@/components/CopaLiberoLogo";
import { SetupBanner } from "@/components/SetupBanner";
import { LoginForm } from "@/components/admin/LoginForm";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isAdminBackendConfigured, isD1Backend, isFirebaseConfigured, isOfflineDemoData } from "@/lib/env";
import { isUserAdmin } from "@/lib/firestore-queries";

export default function AdminLoginPage() {
  const router = useRouter();
  const configured = isFirebaseConfigured();
  const d1 = isD1Backend();
  const adminOk = isAdminBackendConfigured();
  const offlineDemo = isOfflineDemoData();
  const [checking, setChecking] = useState(adminOk);

  useEffect(() => {
    if (!adminOk) return;

    if (d1) {
      let cancelled = false;
      void fetch("/api/copalibero/auth/me", { credentials: "include" })
        .then((r) => r.json() as Promise<{ user?: unknown }>)
        .then((j) => {
          if (cancelled) return;
          if (j.user) router.replace("/admin");
          else setChecking(false);
        })
        .catch(() => {
          if (!cancelled) setChecking(false);
        });
      return () => {
        cancelled = true;
      };
    }

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
  }, [adminOk, configured, d1, router]);

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
            Firebase o Cloudflare D1: activá{" "}
            <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_COPALIBERO_BACKEND=d1</code> con D1
            migrado, o completá Firebase y quitá{" "}
            <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_COPALIBERO_DEMO=1</code>.
          </p>
        </div>
      </div>
    );
  }

  if (d1) {
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
          <p className="mt-1 text-center text-sm text-muted">Ingresá con la cuenta de administrador (D1)</p>
          <div className="mt-8">
            <LoginForm />
          </div>
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
