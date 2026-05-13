import Image from "next/image";

const base = process.env.NEXT_PUBLIC_STATIC_BASE ?? "";
const SRC = `${base}/copalibero-logo.png`;
const W = 225;
const H = 225;

type CopaLiberoLogoProps = {
  className?: string;
  priority?: boolean;
  /**
   * `dark` — invierte el PNG pensado para fondo claro (negro sobre blanco) para que quede bien en la app oscura.
   * `original` — sin filtros (p. ej. impresión o fondo claro).
   */
  variant?: "dark" | "original";
};

const variantStyles: Record<NonNullable<CopaLiberoLogoProps["variant"]>, string> = {
  dark: "invert brightness-[1.06] contrast-[1.02]",
  original: "",
};

/** Logo oficial (PNG en `public/copalibero-logo.png`). */
export function CopaLiberoLogo({
  className,
  priority,
  variant = "dark",
}: CopaLiberoLogoProps) {
  const v = variantStyles[variant];
  return (
    <Image
      src={SRC}
      alt="CopaLibero"
      width={W}
      height={H}
      className={[v, className].filter(Boolean).join(" ")}
      priority={priority}
    />
  );
}
