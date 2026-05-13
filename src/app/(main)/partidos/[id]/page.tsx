import { PartidoDetailPageClient } from "./PartidoDetailPageClient";

/** GitHub Pages (`output: "export"`): sin pre-render por id; el cliente resuelve la ruta. */
export function generateStaticParams() {
  return [];
}

export default function PartidoDetailPage() {
  return <PartidoDetailPageClient />;
}
