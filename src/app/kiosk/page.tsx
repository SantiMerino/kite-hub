import KioskScanner from "@/components/kiosk/KioskScanner";
import ThemeToggle from "@/components/theme/theme-toggle";
import { FlaskConical } from "lucide-react";

export default function KioskPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-violet-50 to-background dark:from-background dark:to-muted/25">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="size-6 shrink-0 text-violet-600 dark:text-violet-400" />
          <span className="font-bold text-base text-foreground truncate">Kite Hub</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <a
            href="/api/auth/login?returnTo=/admin/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Panel staff →
          </a>
        </div>
      </header>

      {/* Scanner */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-foreground">Préstamo de herramientas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escanea primero el QR de la herramienta, luego tu carné.
          </p>
        </div>

        <KioskScanner />
      </main>
    </div>
  );
}
