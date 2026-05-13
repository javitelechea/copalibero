import Image from "next/image";

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type Props = {
  name: string;
  url: string | null;
  size?: number;
  className?: string;
};

export function PlayerAvatar({ name, url, size = 44, className = "" }: Props) {
  const dim = `${size}px`;
  if (url) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full ring-2 ring-border ${className}`}
        style={{ width: dim, height: dim }}
      >
        <Image
          src={url}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-accent ring-2 ring-border ${className}`}
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
