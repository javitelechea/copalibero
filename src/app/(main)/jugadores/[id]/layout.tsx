import { DEMO_PLAYERS } from "@/lib/demo-data";

export function generateStaticParams() {
  return DEMO_PLAYERS.map((p) => ({ id: p.id }));
}

export default function JugadorIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
