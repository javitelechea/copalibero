"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore/lite";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { getFirestoreDb } from "@/lib/firebase/client";
import { fileToAvatarDataUrl } from "@/lib/avatarDataUrl";
import { isD1Backend, isOfflineDemoData } from "@/lib/env";
import { comparePlayers, playerLabel } from "@/lib/player-label";
import { d1CreatePlayer, d1UpdatePlayer, fetchPlayers, invalidateTournamentDataCache } from "@/lib/firestore-queries";
import { isGuestPlayer } from "@/lib/player-guest";
import type { PlayerRow } from "@/lib/types";
import { Plus, Search } from "lucide-react";

export function PlayersAdmin() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newGuest, setNewGuest] = useState(false);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const offlineDemo = isOfflineDemoData();
  const d1 = isD1Backend();
  const newNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchPlayers(false)
      .then((list) => {
        setPlayers(list);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const sorted = useMemo(
    () => [...players].sort(comparePlayers),
    [players]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.display_name.toLowerCase().includes(q) ||
        (p.nickname?.toLowerCase().includes(q) ?? false)
    );
  }, [sorted, query]);

  function openCreate() {
    setShowCreate(true);
    setMsg("");
    setNewGuest(false);
    setNewNickname("");
    const q = query.trim();
    if (q) setNewName(q);
    queueMicrotask(() => newNameInputRef.current?.focus());
  }

  async function createPlayer(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    const nick = newNickname.trim();
    if (!name && !nick) return;
    if (newGuest && !nick && !name) return;
    const display_name = name || nick;
    const nickname = nick || null;
    setBusy(true);
    setMsg("");
    try {
      if (d1) {
        const created = await d1CreatePlayer(display_name, { nickname, guest: newGuest });
        setPlayers((p) => [...p, created]);
        setNewName("");
        setNewNickname("");
        setNewGuest(false);
        setShowCreate(false);
        setQuery("");
        router.refresh();
        return;
      }
      const db = getFirestoreDb();
      const ref = await addDoc(collection(db, "players"), {
        display_name,
        nickname,
        guest: newGuest,
        active: true,
        created_at: new Date().toISOString(),
      });
      const created: PlayerRow = {
        id: ref.id,
        display_name,
        nickname,
        active: true,
        guest: newGuest,
        avatar_url: null,
        created_at: new Date().toISOString(),
        draft_seed: null,
      };
      setPlayers((p) => [...p, created]);
      setNewName("");
      setNewNickname("");
      setNewGuest(false);
      setShowCreate(false);
      setQuery("");
      invalidateTournamentDataCache();
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setBusy(false);
    }
  }

  async function updatePlayer(id: string, patch: Partial<PlayerRow>) {
    if (d1) {
      const body: Partial<Pick<PlayerRow, "display_name" | "nickname" | "active" | "guest" | "draft_seed">> = {};
      if (typeof patch.display_name === "string") body.display_name = patch.display_name;
      if ("nickname" in patch) {
        body.nickname =
          patch.nickname == null || patch.nickname === undefined
            ? null
            : patch.nickname.trim() || null;
      }
      if (typeof patch.active === "boolean") body.active = patch.active;
      if (typeof patch.guest === "boolean") body.guest = patch.guest;
      if ("draft_seed" in patch) {
        if (patch.draft_seed === null || patch.draft_seed === undefined) {
          body.draft_seed = null;
        } else if (typeof patch.draft_seed === "number" && Number.isFinite(patch.draft_seed)) {
          body.draft_seed = Math.trunc(patch.draft_seed);
        }
      }
      if (Object.keys(body).length === 0) return;
      await d1UpdatePlayer(id, body);
      setPlayers((list) => list.map((p) => (p.id === id ? { ...p, ...body } : p)));
      router.refresh();
      return;
    }
    const db = getFirestoreDb();
    await updateDoc(doc(db, "players", id), patch as Record<string, unknown>);
    setPlayers((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    invalidateTournamentDataCache();
    router.refresh();
  }

  if (!loaded) {
    return <p className="text-center text-muted">Cargando jugadores…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">Jugadores</h1>
        <p className="mt-1 text-sm text-muted">
          {d1
            ? "Modo Cloudflare D1: solo nombre y estado activo (sin fotos)."
            : "La foto se guarda en la base (recortada automáticamente). No hace falta Firebase Storage."}
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugador…"
            autoComplete="off"
            className="min-h-[48px] w-full rounded-xl border border-border bg-surface-2 py-3 pl-10 pr-4 text-sm outline-none ring-accent/20 focus:ring-2"
          />
        </div>
        <button
          type="button"
          disabled={offlineDemo}
          onClick={() => openCreate()}
          aria-label="Nuevo jugador"
          className="flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-bold text-canvas disabled:opacity-50 sm:px-4"
        >
          <Plus className="h-5 w-5" />
          <span className="inline sm:hidden">Nuevo</span>
        </button>
      </div>

      {query.trim() && filtered.length === 0 ? (
        <p className="text-sm text-muted">
          No hay coincidencias con «{query.trim()}». Tocá <span className="font-semibold text-fg">+</span> para
          crearlo.
        </p>
      ) : null}

      {showCreate ? (
      <form
        onSubmit={(e) => void createPlayer(e)}
        className="rounded-2xl border border-border bg-surface p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Nuevo jugador</h2>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setNewName("");
              setNewNickname("");
              setNewGuest(false);
            }}
            className="text-xs font-medium text-muted hover:text-fg"
          >
            Cerrar
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={newNameInputRef}
              placeholder="Nombre completo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="min-h-[48px] flex-1 rounded-xl border border-border bg-surface-2 px-4 py-3 outline-none ring-accent/20 focus:ring-2"
            />
            <input
              placeholder="Apodo (visible en partidos)"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              className="min-h-[48px] flex-1 rounded-xl border border-border bg-surface-2 px-4 py-3 outline-none ring-accent/20 focus:ring-2"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={newGuest}
              onChange={(e) => setNewGuest(e.target.checked)}
              className="size-4 rounded border-border accent-amber-500"
            />
            Invitado (no suma en la tabla general ni en goleadores)
          </label>
          <button
            type="submit"
            disabled={busy || offlineDemo || (!newName.trim() && !newNickname.trim())}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-accent px-5 font-bold text-canvas disabled:opacity-50 sm:self-start"
          >
            <Plus className="h-5 w-5" />
            Agregar
          </button>
        </div>
        {offlineDemo && (
          <p className="mt-2 text-xs text-muted">
            Modo demo sin Firebase: no se pueden crear jugadores hasta conectar el proyecto.
          </p>
        )}
      </form>
      ) : null}

      {msg && <p className="text-sm text-red-400">{msg}</p>}

      <ul className="flex flex-col gap-3">
        {filtered.map((p) => (
          <li
            key={p.id}
            className={`rounded-2xl border bg-surface p-4 ${
              isGuestPlayer(p) ? "border-amber-500/30" : "border-border"
            }`}
          >
            <div className="flex gap-3">
              <PlayerAvatar name={playerLabel(p)} url={p.avatar_url} size={56} />
              <div className="min-w-0 flex-1 space-y-2">
                {isGuestPlayer(p) ? (
                  <span className="inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                    Invitado
                  </span>
                ) : null}
                <label className="flex flex-col gap-1 text-xs text-muted">
                  <span>Nombre completo</span>
                  <input
                    defaultValue={p.display_name}
                    key={`name-${p.id}-${p.display_name}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== p.display_name) void updatePlayer(p.id, { display_name: v });
                    }}
                    className="w-full rounded-lg border border-transparent bg-surface-2 px-3 py-2 font-semibold outline-none focus:border-accent/50"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  <span>Apodo (visible en la app)</span>
                  <input
                    defaultValue={p.nickname ?? ""}
                    placeholder="Ej. Mosca"
                    key={`nick-${p.id}-${p.nickname ?? ""}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      const cur = p.nickname?.trim() ?? "";
                      if (v !== cur) void updatePlayer(p.id, { nickname: v || null });
                    }}
                    className="w-full rounded-lg border border-transparent bg-surface-2 px-3 py-2 font-semibold text-accent outline-none focus:border-accent/50"
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={p.guest}
                    onChange={(e) => void updatePlayer(p.id, { guest: e.target.checked })}
                    className="size-4 rounded border-border accent-amber-500"
                  />
                  Invitado (no suma en la tabla)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={p.active}
                    onChange={(e) => void updatePlayer(p.id, { active: e.target.checked })}
                    className="size-4 rounded border-border accent-accent"
                  />
                  Activo en el torneo
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  <span>Prioridad borrador (opcional: número menor = antes si empata en la tabla)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Vacío = automático"
                    defaultValue={p.draft_seed ?? ""}
                    key={`seed-${p.id}-${p.draft_seed ?? "x"}`}
                    disabled={offlineDemo}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      if (raw === "") {
                        if (p.draft_seed != null) void updatePlayer(p.id, { draft_seed: null });
                        return;
                      }
                      const n = Number(raw);
                      if (!Number.isFinite(n)) return;
                      const v = Math.trunc(n);
                      if (v !== (p.draft_seed ?? null)) void updatePlayer(p.id, { draft_seed: v });
                    }}
                    className="min-h-[40px] w-full max-w-[12rem] rounded-lg border border-border bg-surface-2 px-3 py-2 tabular-nums outline-none focus:border-accent/50"
                  />
                </label>
                {!d1 ? (
                <label className="mt-1 flex cursor-pointer flex-wrap items-center gap-2 text-sm text-accent">
                  <span className="rounded-lg bg-accent/10 px-3 py-1.5 font-medium">
                    Elegir foto
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setBusy(true);
                      setMsg("");
                      void fileToAvatarDataUrl(file)
                        .then((dataUrl) => updatePlayer(p.id, { avatar_url: dataUrl }))
                        .catch((err: Error) => setMsg(err.message))
                        .finally(() => setBusy(false));
                    }}
                  />
                </label>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
