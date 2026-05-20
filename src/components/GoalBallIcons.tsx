/** Una pelota por cada gol (sin texto "2 goles"). */
export function GoalBallIcons({ count, size = "md" }: { count: number; size?: "sm" | "md" }) {
  if (count <= 0) return null;
  const ballClass = size === "sm" ? "text-sm" : "text-base";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-px ${ballClass}`}
      title={count === 1 ? "1 gol" : `${count} goles`}
      aria-label={count === 1 ? "1 gol" : `${count} goles`}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="leading-none" aria-hidden>
          ⚽
        </span>
      ))}
    </span>
  );
}
