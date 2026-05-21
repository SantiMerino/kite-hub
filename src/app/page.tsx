import { redirect } from "next/navigation";

/** Punto de entrada: superficie kiosk para préstamos en estación. */
export default function HomePage() {
  redirect("/kiosk");
}
