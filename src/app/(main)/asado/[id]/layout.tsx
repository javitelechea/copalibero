import { DEMO_ASADOS } from "@/lib/demo-data";

export function generateStaticParams() {
  return DEMO_ASADOS.map((a) => ({ id: a.id }));
}

export default function AsadoIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
