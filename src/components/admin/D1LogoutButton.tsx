"use client";

import { useRouter } from "next/navigation";
import { isD1Backend } from "@/lib/env";

export function D1LogoutButton() {
  const router = useRouter();
  if (!isD1Backend()) return null;

  return (
    <button
      type="button"
      className="text-muted hover:text-fg"
      onClick={() =>
        void fetch("/api/copalibero/auth/logout", { method: "POST", credentials: "include" }).then(() =>
          router.replace("/admin/login")
        )
      }
    >
      Salir
    </button>
  );
}
