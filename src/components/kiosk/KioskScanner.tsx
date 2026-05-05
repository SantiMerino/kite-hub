"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  QrCode,
  CreditCard,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Clock,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidCardKey, normalizeCardKey } from "@/lib/utils";
import { kiteError, kiteWarning, getKiteToastFill } from "@/lib/kite-sileo";
import QRCameraModal from "./QRCameraModal";

type Step = "idle" | "tool_scanned" | "card_scanned" | "loading" | "result";

type ResultType =
  | { action: "borrowed"; loanId: number; toolName: string; studentName: string; expectedReturnDate: string }
  | { action: "requested"; loanId: number; toolName: string; studentName: string; message: string }
  | { action: "returned"; loanId: number; toolName: string; studentName: string }
  | { action: "conflict"; message: string; borrowerName: string | null }
  | {
      action: "error";
      message: string;
      block?: {
        reason: string;
        isPermanent: boolean;
        endsAt: string | null;
        startsAt: string | null;
      };
    };

type ToolPreview = {
  toolId: string;
  toolName: string;
  requiresApproval: boolean;
};

export default function KioskScanner() {
  const kioskPublicKey = process.env.NEXT_PUBLIC_KIOSK_KEY ?? "";
  const [step, setStep] = useState<Step>("idle");
  const [toolPayload, setToolPayload] = useState("");
  const [cardKey, setCardKey] = useState("");
  const [result, setResult] = useState<ResultType | null>(null);
  const [toolPreview, setToolPreview] = useState<ToolPreview | null>(null);
  const [toolPreviewLoading, setToolPreviewLoading] = useState(false);
  const [showToolCamera, setShowToolCamera] = useState(false);
  const [showCardCamera, setShowCardCamera] = useState(false);
  const [toolManual, setToolManual] = useState("");
  const [cardManual, setCardManual] = useState("");

  const idempotencyKeyRef = useRef<string>("");

  const reset = useCallback(() => {
    setStep("idle");
    setToolPayload("");
    setCardKey("");
    setResult(null);
    setToolPreview(null);
    setToolPreviewLoading(false);
    setToolManual("");
    setCardManual("");
    idempotencyKeyRef.current = "";
  }, []);

  const loadToolPreview = useCallback(async (tool: string) => {
    if (!kioskPublicKey) return;
    setToolPreviewLoading(true);
    setToolPreview(null);
    try {
      const res = await fetch("/api/kiosk/tool-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kiosk-key": kioskPublicKey,
        },
        body: JSON.stringify({ toolPayload: tool }),
      });
      const data = await res.json();
      if (!res.ok) {
        kiteWarning({
          title: "Sin datos de la herramienta",
          description: data.error ?? "Puedes seguir con el carné.",
        });
        return;
      }
      setToolPreview(data as ToolPreview);
    } catch {
      kiteWarning({
        title: "Sin conexión",
        description: "No se pudo verificar la herramienta. Puedes continuar.",
      });
    } finally {
      setToolPreviewLoading(false);
    }
  }, [kioskPublicKey]);

  const handleToolScanned = useCallback(
    (payload: string) => {
      const normalizedPayload = payload.trim().toUpperCase();
      setToolPayload(normalizedPayload);
      setShowToolCamera(false);
      setStep("tool_scanned");
      void loadToolPreview(normalizedPayload);
    },
    [loadToolPreview],
  );

  const handleToolManual = useCallback(() => {
    const val = toolManual.trim().toUpperCase();
    if (!val) {
      kiteWarning({ title: "Falta el ID", description: "Ej. MAR_001" });
      return;
    }
    handleToolScanned(val);
  }, [toolManual, handleToolScanned]);

  const submitLoanOrReturn = useCallback(
    async (tool: string, card: string) => {
      if (!kioskPublicKey) {
        kiteError({
          title: "Kiosk no configurado",
          description: "Falta NEXT_PUBLIC_KIOSK_KEY. Avisa al encargado.",
        });
        return;
      }

      setStep("loading");
      idempotencyKeyRef.current = `${tool}:${card}:${Date.now()}`;

      try {
        const res = await fetch("/api/kiosk/loan-or-return", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-kiosk-key": kioskPublicKey,
            "idempotency-key": idempotencyKeyRef.current,
          },
          body: JSON.stringify({ toolPayload: tool, cardKey: card }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.blocked) {
            setResult({
              action: "error",
              message: data.error ?? "Acceso bloqueado.",
              block: data.block,
            });
          } else {
            setResult({ action: "error", message: data.error ?? "Error desconocido" });
          }
        } else {
          setResult(data as ResultType);
        }
      } catch {
        setResult({ action: "error", message: "Sin conexión. Reintenta." });
      }

      setStep("result");
    },
    [kioskPublicKey],
  );

  const handleCardScanned = useCallback(
    async (raw: string) => {
      const key = normalizeCardKey(raw);
      setShowCardCamera(false);

      if (!isValidCardKey(key)) {
        kiteWarning({
          title: "Carné no válido",
          description: "Formato KEY_000000",
        });
        return;
      }

      setCardKey(key);
      await submitLoanOrReturn(toolPayload, key);
    },
    [toolPayload, submitLoanOrReturn],
  );

  const handleCardManual = useCallback(async () => {
    const key = normalizeCardKey(cardManual);
    if (!isValidCardKey(key)) {
      kiteWarning({
        title: "Carné no válido",
        description: "Formato KEY_000000",
      });
      return;
    }
    setCardKey(key);
    await submitLoanOrReturn(toolPayload, key);
  }, [cardManual, toolPayload, submitLoanOrReturn]);

  return (
    <div className="w-full space-y-5">
      <KioskStepToast
        stepNumber={1}
        title="Herramienta"
        icon={<QrCode className="size-7" strokeWidth={2.25} />}
        done={!!toolPayload}
        active={step === "idle"}
        value={toolPayload}
        dimmed={false}
      >
        {step === "idle" && (
          <div className="space-y-4 pt-1">
            <Button className="w-full min-h-14 text-lg font-semibold" size="lg" onClick={() => setShowToolCamera(true)}>
              <QrCode className="size-5 shrink-0" />
              Escanear QR
            </Button>
            <div className="flex gap-2">
              <Input
                placeholder="O escribe el ID (MAR_001)"
                value={toolManual}
                onChange={(e) => setToolManual(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleToolManual()}
                className="font-mono uppercase h-12 text-base"
              />
              <Button variant="outline" className="h-12 px-5 text-base shrink-0" onClick={handleToolManual}>
                OK
              </Button>
            </div>
          </div>
        )}
      </KioskStepToast>

      <KioskStepToast
        stepNumber={2}
        title="Carné"
        icon={<CreditCard className="size-7" strokeWidth={2.25} />}
        done={!!cardKey}
        active={step === "tool_scanned"}
        value={cardKey}
        dimmed={step === "idle"}
      >
        {step === "tool_scanned" && (
          <div className="space-y-4 pt-1">
            {toolPreviewLoading && (
              <StatusPill variant="neutral">
                <Loader2 className="size-5 animate-spin shrink-0" />
                <span className="text-base font-medium">Comprobando…</span>
              </StatusPill>
            )}
            {!toolPreviewLoading && toolPreview?.requiresApproval && (
              <StatusPill variant="pending">
                <Clock className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 text-left">
                  <p className="text-lg font-bold text-foreground">Requiere aprobación</p>
                  <p className="text-sm text-muted-foreground">Al pasar el carné queda en cola.</p>
                </div>
              </StatusPill>
            )}
            {!toolPreviewLoading && !toolPreview?.requiresApproval && toolPreview && (
              <StatusPill variant="pass">
                <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0 text-left">
                  <p className="text-lg font-bold text-foreground">Listo para préstamo</p>
                  <p className="text-sm text-muted-foreground">Sin aprobación previa.</p>
                </div>
              </StatusPill>
            )}
            <Button
              className="w-full min-h-14 text-lg font-semibold"
              size="lg"
              onClick={() => setShowCardCamera(true)}
            >
              <QrCode className="size-5 shrink-0" />
              Escanear carné
            </Button>
            <div className="flex gap-2">
              <Input
                placeholder="O carné: KEY_000000"
                value={cardManual}
                onChange={(e) => setCardManual(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleCardManual()}
                className="font-mono uppercase h-12 text-base flex-1"
                maxLength={10}
              />
              <Button variant="outline" className="h-12 px-5 text-base shrink-0" onClick={handleCardManual}>
                OK
              </Button>
            </div>
          </div>
        )}
      </KioskStepToast>

      {step === "loading" && (
        <div
          className="rounded-2xl border border-border/80 shadow-lg px-6 py-10 flex flex-col items-center gap-4 animate-fade-in"
          style={{ backgroundColor: getKiteToastFill("neutral") }}
        >
          <Loader2 className="size-12 text-primary animate-spin" />
          <p className="text-xl font-semibold text-foreground">Procesando…</p>
        </div>
      )}

      {step === "result" && result && <KioskResultToast result={result} onReset={reset} />}

      {showToolCamera && (
        <QRCameraModal title="Herramienta" onScan={handleToolScanned} onClose={() => setShowToolCamera(false)} />
      )}
      {showCardCamera && (
        <QRCameraModal title="Carné" onScan={handleCardScanned} onClose={() => setShowCardCamera(false)} />
      )}
    </div>
  );
}

function KioskStepToast({
  stepNumber,
  title,
  icon,
  done,
  active,
  value,
  dimmed,
  children,
}: {
  stepNumber: number;
  title: string;
  icon: React.ReactNode;
  done: boolean;
  active: boolean;
  value: string;
  dimmed: boolean;
  children?: React.ReactNode;
}) {
  const bg = done ? getKiteToastFill("success") : getKiteToastFill("neutral");
  const showDim = dimmed && !active && !done;

  return (
    <div
      className={`rounded-2xl border shadow-lg px-5 py-5 transition-all ${
        done
          ? "border-emerald-300/90 dark:border-emerald-700/50"
          : active
            ? "border-border ring-2 ring-primary/25"
            : "border-border/70"
      } ${showDim ? "pointer-events-none opacity-50 bg-muted/40" : ""}`}
      style={!showDim ? { backgroundColor: bg } : undefined}
    >
      <div className="flex items-center gap-4">
        <div
          className={`size-12 shrink-0 rounded-full flex items-center justify-center text-lg font-bold ${
            done
              ? "bg-emerald-500! text-white"
              : active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {done ? <CheckCircle2 className="size-7" strokeWidth={2.5} /> : stepNumber}
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="text-primary shrink-0">{icon}</div>
          <span className="text-xl font-bold text-foreground truncate">{title}</span>
          {done && value ? (
            <span className="ml-auto font-mono text-sm sm:text-base text-muted-foreground truncate max-w-[40%]">
              {value}
            </span>
          ) : null}
        </div>
      </div>
      {children ? <div className="mt-5 pl-0 sm:pl-17">{children}</div> : null}
    </div>
  );
}

function StatusPill({
  variant,
  children,
}: {
  variant: "pass" | "pending" | "neutral";
  children: React.ReactNode;
}) {
  const ring =
    variant === "pass"
      ? "border-emerald-300/90 dark:border-emerald-700/50"
      : variant === "pending"
        ? "border-amber-300/90 dark:border-amber-700/50"
        : "border-border";
  const fill =
    variant === "pass"
      ? getKiteToastFill("success")
      : variant === "pending"
        ? getKiteToastFill("warning")
        : getKiteToastFill("neutral");

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 ${ring}`}
      style={{ backgroundColor: fill }}
    >
      {children}
    </div>
  );
}

function KioskResultToast({
  result,
  onReset,
}: {
  result: ResultType;
  onReset: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (result.action !== "error" || !result.block?.endsAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [result]);

  const pass = result.action === "borrowed" || result.action === "returned";
  const pending = result.action === "requested" || result.action === "conflict";
  const denied = result.action === "error";

  const conflictTitle =
    result.action === "conflict" && result.message.toLowerCase().includes("solicitud pendiente")
      ? "Pendiente"
      : "No disponible";

  const remainingLabel =
    result.action === "error" && result.block?.endsAt
      ? formatRemainingMs(new Date(result.block.endsAt).getTime() - now)
      : null;

  let fillKey: "success" | "warning" | "error" = "success";
  if (pending) fillKey = "warning";
  if (denied) fillKey = "error";

  const Icon =
    pass ? CheckCircle2 : pending ? Clock : result.action === "error" && result.block ? Ban : XCircle;

  const iconWrap = pass
    ? "bg-emerald-500! text-white"
    : pending
      ? "bg-amber-400! text-amber-950 dark:bg-amber-500! dark:text-amber-950!"
      : "bg-red-500! text-white";

  const borderTone = pass
    ? "border-emerald-400/80 dark:border-emerald-600/45"
    : pending
      ? "border-amber-400/80 dark:border-amber-600/45"
      : "border-red-400/80 dark:border-red-600/45";

  return (
    <div
      className={`rounded-2xl border-2 shadow-xl px-5 py-6 sm:px-7 sm:py-8 animate-scale-in text-left ${borderTone}`}
      style={{ backgroundColor: getKiteToastFill(fillKey) }}
    >
      <div className="flex gap-5 items-start">
        <div
          className={`size-16 sm:size-18 shrink-0 rounded-full flex items-center justify-center shadow-md ${iconWrap}`}
        >
          <Icon className="size-9 sm:size-10" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {result.action === "borrowed" && (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">Listo · Prestado</h2>
              <p className="text-lg sm:text-xl font-semibold text-foreground">
                {result.studentName}
                <span className="font-normal text-muted-foreground"> · </span>
                {result.toolName}
              </p>
              <p className="text-base text-muted-foreground">
                Vence{" "}
                {new Date(result.expectedReturnDate).toLocaleDateString("es-MX", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </>
          )}

          {result.action === "returned" && (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">Listo · Devuelto</h2>
              <p className="text-lg sm:text-xl font-semibold text-foreground">
                {result.studentName}
                <span className="font-normal text-muted-foreground"> · </span>
                {result.toolName}
              </p>
            </>
          )}

          {result.action === "requested" && (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">Pendiente</h2>
              <p className="text-lg sm:text-xl font-semibold text-foreground">
                {result.studentName}
                <span className="font-normal text-muted-foreground"> · </span>
                {result.toolName}
              </p>
              <p className="text-base text-muted-foreground line-clamp-2">{result.message}</p>
            </>
          )}

          {result.action === "conflict" && (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{conflictTitle}</h2>
              <p className="text-lg font-medium text-foreground">{result.message}</p>
              {result.borrowerName ? (
                <p className="text-base text-muted-foreground">Con: {result.borrowerName}</p>
              ) : null}
            </>
          )}

          {result.action === "error" && result.block && (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">Denegado</h2>
              <p className="text-lg font-semibold text-foreground">{result.block.reason}</p>
              {result.block.isPermanent ? (
                <p className="text-base font-medium text-foreground">Bloqueo permanente</p>
              ) : (
                <p className="text-base font-medium text-foreground">
                  Temporal{remainingLabel ? ` · ${remainingLabel}` : ""}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Para más información o aclaraciones, acude al encargado del laboratorio.
              </p>
            </>
          )}

          {result.action === "error" && !result.block && (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">No se pudo</h2>
              <p className="text-lg font-medium text-foreground">{result.message}</p>
            </>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-8 w-full min-h-14 text-lg font-semibold gap-2 border-2 bg-background/90"
        onClick={onReset}
      >
        <RotateCcw className="size-5" />
        Nueva operación
      </Button>
    </div>
  );
}

function formatRemainingMs(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
