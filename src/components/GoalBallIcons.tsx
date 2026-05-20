/** Pelota por cada gol (estilo planilla de partido). */
export function GoalBallIcons({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5"
      aria-label={`${count} gol${count > 1 ? "es" : ""}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <SoccerBallIcon key={i} />
      ))}
    </span>
  );
}

function SoccerBallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.125rem] text-amber-400" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.95" />
      <path
        fill="#1a1a1a"
        d="M12 4.5 14.9 10h5.1l-4.1 3 1.6 4.8L12 15.8 6.5 17.8l1.6-4.8-4.1-3h5.1L12 4.5z"
      />
      <circle cx="12" cy="12" r="10" fill="none" stroke="#0d0d0d" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}
