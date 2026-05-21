"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ThemeToggle from "@/components/theme/theme-toggle";
import { kiteError, kiteSuccess } from "@/lib/kite-sileo";

type Step = "email" | "otp";

function formatCountdown(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${sec}s`;
}

export default function AdminLoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (resendAvailableAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [resendAvailableAt]);

  const resendRemaining = Math.max(0, resendAvailableAt - now);
  const canResend = resendRemaining <= 0;

  const requestOtp = useCallback(
    async (isResend: boolean) => {
      const trimmed = email.trim();
      if (!trimmed) {
        kiteError({ title: "Correo requerido", description: "Introduce tu correo institucional." });
        return;
      }

      setLoading(true);
      try {
        const endpoint = isResend
          ? "/api/auth/admin/resend-otp"
          : "/api/auth/admin/request-otp";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = (await res.json()) as {
          error?: string;
          maskedEmail?: string;
          resendAvailableAt?: number;
          message?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "No se pudo enviar el código.");
        }

        setMaskedEmail(data.maskedEmail ?? trimmed);
        setResendAvailableAt(data.resendAvailableAt ?? Date.now() + 60_000);
        setStep("otp");
        kiteSuccess({
          title: isResend ? "Código reenviado" : "Revisa tu correo",
          description: data.message ?? "Si estás autorizado, recibirás el código en breve.",
        });
      } catch (err) {
        kiteError({
          title: "Error",
          description: err instanceof Error ? err.message : "Intenta de nuevo.",
        });
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    const otp = code.replace(/\D/g, "").slice(0, 6);
    if (otp.length !== 6) {
      kiteError({ title: "Código incompleto", description: "Introduce los 6 dígitos." });
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ returnTo });
      const res = await fetch(`/api/auth/admin/verify-otp?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, code: otp }),
      });
      const data = (await res.json()) as {
        error?: string;
        returnTo?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Código incorrecto.");
      }

      kiteSuccess({ title: "Sesión iniciada", description: "Redirigiendo al panel…" });
      router.push(data.returnTo ?? returnTo);
      router.refresh();
    } catch (err) {
      kiteError({
        title: "No se pudo iniciar sesión",
        description: err instanceof Error ? err.message : "Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-violet-600 dark:text-violet-400" aria-hidden />
          <span className="text-sm font-bold text-foreground">Kite Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/kiosk"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground"
          >
            Volver al kiosk
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md animate-fade-in rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/20">
              <Shield className="size-5 text-violet-700 dark:text-violet-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Acceso administrativo</h1>
              <p className="text-sm text-muted-foreground">
                Solo personal autorizado (admin / encargado)
              </p>
            </div>
          </div>

          {step === "email" ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void requestOtp(false);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="admin-email">Correo institucional</Label>
                <Input
                  id="admin-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="nombre@institucion.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  maxLength={320}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando código…
                  </>
                ) : (
                  "Enviar código"
                )}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={verifyOtp}>
              <p className="text-sm text-muted-foreground">
                Código enviado a{" "}
                <span className="font-medium text-foreground">{maskedEmail}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="admin-otp">Código de 6 dígitos</Label>
                <Input
                  id="admin-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={loading}
                  maxLength={6}
                  pattern="\d{6}"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verificando…
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={loading}
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                >
                  Cambiar correo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || !canResend}
                  onClick={() => void requestOtp(true)}
                >
                  {canResend
                    ? "Reenviar código"
                    : `Reenviar en ${formatCountdown(resendRemaining)}`}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
