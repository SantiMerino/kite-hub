import type { Metadata, Viewport } from "next";
import KioskScannerDSI from "@/components/kiosk/KioskScannerDSI";

export const metadata: Metadata = {
  title: "Kiosk DSI",
  description: "Estación táctil 5\" DSI para Raspberry Pi (Kite Hub)",
};

/**
 * Viewport calibrado para Chromium en modo `--kiosk` sobre Raspberry Pi con
 * el 5" DSI display (800×480 landscape o 720×1280 portrait). El layout completo
 * cabe en `h-dvh` sin scroll; el teclado virtual se monta como overlay y no
 * desplaza el contenido.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

/**
 * Página dedicada al kiosko en hardware Raspberry Pi + 5" DSI display.
 *
 * Sólo apunta a este path el navegador del Pi (`http://<host>/kiosk/dsi`); la
 * ruta `/kiosk` original sigue siendo la versión web "responsiva" para
 * desktop / tablet / monitor externo.
 *
 * Diferencias deliberadas con `/kiosk`:
 *   - Sin enlace "Staff" en el header (kiosko bloqueado).
 *   - Sin botones / modal de cámara (el hardware no tiene módulo).
 *   - Layout *focused-mode*: un paso a la vez, tipografía grande, sin scroll.
 */
export default function KioskDsiPage() {
  return <KioskScannerDSI />;
}
