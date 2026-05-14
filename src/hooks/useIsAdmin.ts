"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isD1Backend, isFirebaseConfigured, isOfflineDemoData, isStaticExportBuild } from "@/lib/env";
import { isUserAdmin } from "@/lib/firestore-queries";

/** Sesión de administrador (Firebase UID en `admins` o cookie D1 en `/api/copalibero/auth/me`). */
export function useIsAdmin(): { isAdmin: boolean; ready: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isStaticExportBuild() || isOfflineDemoData()) {
      setIsAdmin(false);
      setReady(true);
      return;
    }

    if (isD1Backend()) {
      let cancelled = false;
      void fetch("/api/copalibero/auth/me", { credentials: "include" })
        .then((r) => r.json() as Promise<{ user?: unknown }>)
        .then((j) => {
          if (cancelled) return;
          setIsAdmin(Boolean(j.user));
          setReady(true);
        })
        .catch(() => {
          if (!cancelled) {
            setIsAdmin(false);
            setReady(true);
          }
        });
      return () => {
        cancelled = true;
      };
    }

    if (!isFirebaseConfigured()) {
      setIsAdmin(false);
      setReady(true);
      return;
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setReady(true);
        return;
      }
      try {
        setIsAdmin(await isUserAdmin(user.uid));
      } catch {
        setIsAdmin(false);
      } finally {
        setReady(true);
      }
    });
    return () => unsub();
  }, []);

  return { isAdmin, ready };
}
