"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isD1Backend, isFirebaseConfigured, isStaticExportBuild } from "@/lib/env";
import { isUserAdmin } from "@/lib/firestore-queries";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const firebaseOk = isFirebaseConfigured();
  const d1 = isD1Backend();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isStaticExportBuild()) {
      router.replace("/");
      return;
    }
    if (!d1 && !firebaseOk) {
      router.replace("/admin/login");
      return;
    }

    if (d1) {
      let cancelled = false;
      void fetch("/api/copalibero/auth/me", { credentials: "include" })
        .then((r) => r.json() as Promise<{ user?: unknown }>)
        .then((j) => {
          if (cancelled) return;
          if (!j.user) router.replace("/admin/login");
          else setReady(true);
        })
        .catch(() => {
          if (!cancelled) router.replace("/admin/login");
        });
      return () => {
        cancelled = true;
      };
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      if (!(await isUserAdmin(user.uid))) {
        router.replace("/");
        return;
      }
      setReady(true);
    });
    return () => unsub();
  }, [d1, firebaseOk, router]);

  if (isStaticExportBuild()) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 text-muted">
        Redirigiendo…
      </div>
    );
  }

  if (!d1 && !firebaseOk) {
    return <div className="min-h-dvh bg-canvas" aria-hidden />;
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 text-muted">
        Cargando…
      </div>
    );
  }
  return <>{children}</>;
}
