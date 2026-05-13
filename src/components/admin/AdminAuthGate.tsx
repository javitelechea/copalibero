"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/env";
import { isUserAdmin } from "@/lib/firestore-queries";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const configured = isFirebaseConfigured();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured) {
      router.replace("/admin/login");
      return;
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
  }, [configured, router]);

  if (!configured) {
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
