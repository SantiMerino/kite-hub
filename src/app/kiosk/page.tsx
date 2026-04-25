import { Metadata } from "next";
import KioskScanner from "@/components/kiosk/KioskScanner";
import { FlaskConical } from "lucide-react";

export const metadata: Metadata = {
  title: "Kite Hub — Préstamo de herramientas",
  description: "Escanea el QR de la herramienta y tu carné para prestar o devolver.",
};

export default function KioskPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-violet-50 to-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-6 text-violet-600" />
          <span className="font-bold text-base">Kite Hub</span>
        </div>
        <a
          href="/api/auth/login?returnTo=/admin/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Panel staff →
        </a>
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
