"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await signOut(getFirebaseAuth());
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted transition hover:border-red-500/40 hover:text-red-300"
    >
      <LogOut className="h-4 w-4" />
      Salir
    </button>
  );
}
