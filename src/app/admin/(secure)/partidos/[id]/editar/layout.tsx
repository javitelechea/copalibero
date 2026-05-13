import { DEMO_MATCHES } from "@/lib/demo-data";

export function generateStaticParams() {
  return DEMO_MATCHES.map((m) => ({ id: m.id }));
}

export default function EditarPartidoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
