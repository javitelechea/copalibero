"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isD1Backend } from "@/lib/env";
import { isUserAdmin } from "@/lib/firestore-queries";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isD1Backend()) {
        const r = await fetch("/api/copalibero/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
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
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const admin = await isUserAdmin(cred.user.uid);
      if (!admin) {
        await signOut(auth);
        setError("Esta cuenta no tiene permisos de administrador.");
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
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none ring-accent/30 focus:ring-2"
        />
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
