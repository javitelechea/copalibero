"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isD1Backend } from "@/lib/env";
import { isUserAdmin } from "@/lib/firestore-queries";

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Solo para Firebase Auth (pide formato mail). */
function firebaseLoginEmail(username: string): string {
  if (!username) return username;
  if (username.includes("@")) return username;
  return `${username}@copalibero.local`;
}

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const useD1 = isD1Backend();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const id = normalizeUsername(username);
    if (!id) {
      setError("Ingresá tu usuario.");
      setLoading(false);
      return;
    }
    try {
      if (useD1) {
        const r = await fetch("/api/copalibero/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: id, password }),
        });
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        if (!r.ok) {
          setError(j.error ?? "Error al iniciar sesión");
          return;
        }
        router.push("/admin");
        return;
      }

      const auth = getFirebaseAuth();
      const cred = await signInWithEmailAndPassword(auth, firebaseLoginEmail(id), password);
      const admin = await isUserAdmin(cred.user.uid);
      if (!admin) {
        await signOut(auth);
        setError(
          `Esta cuenta no tiene permisos de admin. En Firebase → Firestore creá el documento admins/${cred.user.uid} (el ID del documento debe ser exactamente ese UID).`
        );
        return;
      }
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Usuario</span>
        <input
          type="text"
          name="username"
          autoComplete="username"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          placeholder="ej. mosca"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none ring-accent/30 focus:ring-2"
        />
        <p className="mt-1 text-xs text-muted">Sin mail: solo el nombre de usuario (mosca, iorgo…).</p>
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Contraseña</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none ring-accent/30 focus:ring-2"
        />
      </label>
      {error && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-canvas transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
