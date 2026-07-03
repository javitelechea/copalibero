import { redirect } from "next/navigation";

/** Enlace legacy → sección permanente en la barra inferior. */
export default function DiaDelPadreRedirectPage() {
  redirect("/paternidades");
}
