"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const base = process.env.NEXT_PUBLIC_STATIC_BASE ?? "";
const HERO_PHOTO = `${base}/moscampeon-2025.png`;
const W = 887;
const H = 1024;

const CHAMPION_LINK_NAME = 'Rodrigo "Mosca" Coll';
/** Nombre simple para iniciales del avatar de respaldo. */
const CHAMPION_AVATAR_NAME = "Rodrigo Coll";

type Props = {
  /** Si está en la nómina, link opcional al perfil del campeón. */
  championPlayerHref?: string;
  /** Avatar en Firestore; se usa si falta la imagen estática del campeón con la copa. */
  championAvatarUrl?: string | null;
};

export function ChampionHistoria2025({ championPlayerHref, championAvatarUrl }: Props) {
  const [heroFailed, setHeroFailed] = useState(false);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-b from-amber-950/35 via-surface to-surface p-1 shadow-[0_0_48px_-20px_rgb(245_158_11/0.35)]">
      <div className="rounded-[1.35rem] bg-surface/90 px-5 pb-6 pt-5">
        <div className="mb-4 flex flex-col gap-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-amber-200/90">
            Copa Libero 2025
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-fg">Historia</h2>
          <p className="text-sm leading-relaxed text-muted">
            Un capítulo que queda para siempre: felicitaciones al campeón{" "}
            {championPlayerHref ? (
              <Link href={championPlayerHref} className="font-semibold text-accent underline-offset-2 hover:underline">
                Rodrigo &quot;Mosca&quot; Coll
              </Link>
            ) : (
              <span className="font-semibold text-fg">Rodrigo &quot;Mosca&quot; Coll</span>
            )}
            , que levantó la copa con garra y buen fútbol.
          </p>
        </div>

        <figure className="mx-auto max-w-sm">
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-500/20 ring-offset-2 ring-offset-canvas">
            {!heroFailed ? (
              <Image
                src={HERO_PHOTO}
                alt="Rodrigo Mosca Coll, campeón Copa Libero 2025, con la copa"
                width={W}
                height={H}
                className="h-auto w-full object-cover object-center"
                sizes="(max-width: 512px) 100vw, 384px"
                onError={() => setHeroFailed(true)}
                unoptimized
              />
            ) : championAvatarUrl ? (
              <div className="relative aspect-[887/1024] w-full bg-surface-2">
                <Image
                  src={championAvatarUrl}
                  alt={CHAMPION_LINK_NAME}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 512px) 100vw, 384px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex aspect-[887/1024] w-full flex-col items-center justify-center gap-4 bg-surface-2 px-6 text-center">
                <PlayerAvatar name={CHAMPION_AVATAR_NAME} url={null} size={120} />
                <p className="text-xs leading-snug text-muted">
                  Acá irá la foto del campeón con la copa cuando esté en el sitio.
                </p>
              </div>
            )}
          </div>
          <figcaption className="mt-4 text-center">
            <p
              className="bg-gradient-to-r from-amber-100 via-amber-50 to-accent bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl"
            >
              Moscampeón
            </p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
