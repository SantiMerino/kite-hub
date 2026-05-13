import type { Metadata, Viewport } from "next";
import KioskScanner from "@/components/kiosk/KioskScanner";
import ThemeToggle from "@/components/theme/theme-toggle";
import { FlaskConical } from "lucide-react";

export const metadata: Metadata = {
  title: "Kiosk",
  description: "Préstamo y devolución en estación táctil",
};

/** Pi DSI / táctil: anclar al viewport real del navegador en pantalla completa. */
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
 * Superficie fija para pantalla física (p. ej. 800×480 DSI): sin scroll en el documento.
 * El flujo principal cabe en el viewport; entradas alternativas usan el mismo espacio compacto.
 */
export default function KioskPage() {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-linear-to-b from-violet-50 to-background touch-manipulation dark:from-background dark:to-muted/25">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background/90 px-3 py-2 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <FlaskConical
            className="size-5 shrink-0 text-violet-600 dark:text-violet-400"
            aria-hidden
          />
          <span className="truncate text-sm font-bold text-foreground sm:text-base">Kite Hub</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <a
            href="/api/auth/login?returnTo=/admin/dashboard"
            className="text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground sm:text-xs whitespace-nowrap"
          >
            Staff →
          </a>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-1 sm:px-3 sm:pt-2">
        <div className="shrink-0 px-1 pb-1 text-center sm:pb-2">
          <h1 className="text-balance text-[clamp(1.05rem,3.8vmin,1.65rem)] font-bold leading-tight tracking-tight text-foreground">
            Préstamo / devolución
          </h1>
          <p className="text-pretty text-[clamp(0.7rem,2.4vmin,0.95rem)] text-muted-foreground">
            1 Herramienta · 2 Carné
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <KioskScanner />
        </div>
      </main>
    </div>
  );
}
