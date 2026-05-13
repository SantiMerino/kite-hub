"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  FlaskConical,
  Loader2,
  QrCode,
  RotateCcw,
  ScanLine,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, isValidCardKey, normalizeCardKey } from "@/lib/utils";
import { getKiteToastFill, kiteError, kiteWarning } from "@/lib/kite-sileo";
import OnScreenKeyboard from "./OnScreenKeyboard";

/**
 * KioskScannerDSI
 * --------------------------------------------------------------
 * Versión dedicada al hardware Raspberry Pi + 5" DSI display.
 *
 * Diferencias respecto a `KioskScanner.tsx`:
 *   - Header propio sin enlace "Staff" ni `ThemeToggle`.
 *   - Sin botones de cámara ni `QRCameraModal` (no hay módulo).
 *   - Layout *focused mode*: un solo paso visible a la vez; el paso completado
 *     se muestra como pill `✓ MAR_001` en el header.
 *   - Tipografía y tap targets más grandes (clamp 1.6-3rem en títulos).
 *   - Misma máquina de estados y mismos endpoints que el componente original
 *     (`/api/kiosk/tool-preview`, `/api/kiosk/loan-or-return`).
 */

/** USB wedge: limpia CR/LF y BOM que algunos lectores anexan. */
function sanitizeScannerLine(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .trim();
}

type Step = "idle" | "tool_scanned" | "loading" | "result";
type ManualTarget = "tool" | "card";

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

export default function KioskScannerDSI() {
  const kioskPublicKey = process.env.NEXT_PUBLIC_KIOSK_KEY ?? "";

  const [step, setStep] = useState<Step>("idle");
  const [toolPayload, setToolPayload] = useState("");
  const [result, setResult] = useState<ResultType | null>(null);
  const [toolPreview, setToolPreview] = useState<ToolPreview | null>(null);
  const [toolPreviewLoading, setToolPreviewLoading] = useState(false);
  const [toolManual, setToolManual] = useState("");
  const [cardManual, setCardManual] = useState("");
  const [kbTarget, setKbTarget] = useState<ManualTarget | null>(null);

  const idempotencyKeyRef = useRef<string>("");
  const wedgeInputRef = useRef<HTMLInputElement>(null);
  const wedgeFocusTimerRef = useRef<number | null>(null);

  const canWedgeCapture =
    (step === "idle" || step === "tool_scanned") && kbTarget === null;

  const closeKeyboard = useCallback(() => setKbTarget(null), []);

  const reset = useCallback(() => {
    setStep("idle");
    setToolPayload("");
    setResult(null);
    setToolPreview(null);
    setToolPreviewLoading(false);
    setToolManual("");
    setCardManual("");
    setKbTarget(null);
    idempotencyKeyRef.current = "";
  }, []);

  const loadToolPreview = useCallback(
    async (tool: string) => {
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
    },
    [kioskPublicKey],
  );

  const handleToolScanned = useCallback(
    (payload: string) => {
      const normalizedPayload = sanitizeScannerLine(payload).toUpperCase();
      setToolPayload(normalizedPayload);
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
      const key = normalizeCardKey(sanitizeScannerLine(raw));
      if (!isValidCardKey(key)) {
        kiteWarning({ title: "Carné no válido", description: "Formato KEY_000000" });
        return;
      }
      await submitLoanOrReturn(toolPayload, key);
    },
    [toolPayload, submitLoanOrReturn],
  );

  const handleCardManual = useCallback(async () => {
    const key = normalizeCardKey(cardManual);
    if (!isValidCardKey(key)) {
      kiteWarning({ title: "Carné no válido", description: "Formato KEY_000000" });
      return;
    }
    await submitLoanOrReturn(toolPayload, key);
  }, [cardManual, toolPayload, submitLoanOrReturn]);

  const flushWedgeLine = useCallback(
    (raw: string) => {
      const line = sanitizeScannerLine(raw);
      if (!line) return;
      if (step === "idle") {
        handleToolScanned(line);
        return;
      }
      if (step === "tool_scanned") {
        void handleCardScanned(line);
      }
    },
    [step, handleToolScanned, handleCardScanned],
  );

  useEffect(() => {
    if (!canWedgeCapture) return;
    wedgeFocusTimerRef.current = window.setTimeout(() => {
      wedgeInputRef.current?.focus();
    }, 30);
    return () => {
      if (wedgeFocusTimerRef.current !== null) {
        window.clearTimeout(wedgeFocusTimerRef.current);
        wedgeFocusTimerRef.current = null;
      }
    };
  }, [canWedgeCapture, step]);

  const submitFromKeyboard = useCallback(() => {
    if (kbTarget === "tool") {
      handleToolManual();
    } else if (kbTarget === "card") {
      void handleCardManual();
    }
    setKbTarget(null);
  }, [kbTarget, handleToolManual, handleCardManual]);

  const openKeyboardFor = useCallback(
    (target: ManualTarget) => (e: React.PointerEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.currentTarget.blur();
      setKbTarget(target);
    },
    [],
  );

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-linear-to-b from-violet-50 to-background touch-manipulation dark:from-background dark:to-muted/25">
      <DsiHeader toolPayload={toolPayload} step={step} />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-3 pt-2 sm:px-6 sm:pt-3">
        {step === "idle" && (
          <StepView
            stepNumber={1}
            stepIcon={<QrCode className="size-8 shrink-0 sm:size-9" strokeWidth={2.25} aria-hidden />}
            stepTitle="Herramienta"
            wedgeRef={wedgeInputRef}
            wedgePlaceholder="Pasa la herramienta por el lector…"
            wedgeAriaLabel="Captura del lector: herramienta"
            onWedgeKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const el = e.currentTarget;
                const v = el.value;
                el.value = "";
                flushWedgeLine(v);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.currentTarget.value = "";
              }
            }}
            manualValue={toolManual}
            manualPlaceholder="Toca aquí · MAR_001"
            onManualPointerDown={openKeyboardFor("tool")}
            onManualFocus={() => setKbTarget("tool")}
            onManualSubmit={handleToolManual}
          />
        )}

        {step === "tool_scanned" && (
          <StepView
            stepNumber={2}
            stepIcon={<CreditCard className="size-8 shrink-0 sm:size-9" strokeWidth={2.25} aria-hidden />}
            stepTitle="Carné"
            statusPill={
              <ToolPreviewPill
                loading={toolPreviewLoading}
                preview={toolPreview}
              />
            }
            wedgeRef={wedgeInputRef}
            wedgePlaceholder="Pasa el carné por el lector…"
            wedgeAriaLabel="Captura del lector: carné"
            onWedgeKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const el = e.currentTarget;
                const v = el.value;
                el.value = "";
                flushWedgeLine(v);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.currentTarget.value = "";
              }
            }}
            manualValue={cardManual}
            manualPlaceholder="Toca aquí · KEY_000000"
            manualMaxLength={10}
            onManualPointerDown={openKeyboardFor("card")}
            onManualFocus={() => setKbTarget("card")}
            onManualSubmit={() => void handleCardManual()}
            onCancel={reset}
          />
        )}

        {step === "loading" && <LoadingView />}

        {step === "result" && result && <ResultView result={result} onReset={reset} />}
      </main>

      <OnScreenKeyboard
        open={kbTarget === "tool"}
        label="Herramienta"
        value={toolManual}
        placeholder="MAR_001"
        onChange={setToolManual}
        onSubmit={submitFromKeyboard}
        onClose={closeKeyboard}
      />
      <OnScreenKeyboard
        open={kbTarget === "card"}
        label="Carné"
        value={cardManual}
        placeholder="KEY_000000"
        onChange={setCardManual}
        onSubmit={submitFromKeyboard}
        onClose={closeKeyboard}
        maxLength={10}
      />
    </div>
  );
}

/* ──────────────────────────── Subviews ────────────────────────────────── */

function DsiHeader({ toolPayload, step }: { toolPayload: string; step: Step }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-2 backdrop-blur-sm sm:px-5 sm:py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <FlaskConical
          className="size-6 shrink-0 text-violet-600 dark:text-violet-400 sm:size-7"
          aria-hidden
        />
        <span className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
          Kite Hub
        </span>
      </div>

      {toolPayload && step !== "idle" ? (
        <div className="flex min-w-0 shrink items-center gap-2 rounded-full border border-emerald-300/90 bg-emerald-50 px-3 py-1 text-emerald-900 shadow-xs dark:border-emerald-700/55 dark:bg-emerald-950/60 dark:text-emerald-100">
          <CheckCircle2 className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="truncate font-mono text-xs font-bold sm:text-sm">{toolPayload}</span>
        </div>
      ) : null}
    </header>
  );
}

type StepViewProps = {
  stepNumber: 1 | 2;
  stepIcon: React.ReactNode;
  stepTitle: string;
  statusPill?: React.ReactNode;
  wedgeRef: React.RefObject<HTMLInputElement | null>;
  wedgePlaceholder: string;
  wedgeAriaLabel: string;
  onWedgeKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  manualValue: string;
  manualPlaceholder: string;
  manualMaxLength?: number;
  onManualPointerDown: (e: React.PointerEvent<HTMLInputElement>) => void;
  onManualFocus: () => void;
  onManualSubmit: () => void;
  onCancel?: () => void;
};

function StepView({
  stepNumber,
  stepIcon,
  stepTitle,
  statusPill,
  wedgeRef,
  wedgePlaceholder,
  wedgeAriaLabel,
  onWedgeKeyDown,
  manualValue,
  manualPlaceholder,
  manualMaxLength,
  onManualPointerDown,
  onManualFocus,
  onManualSubmit,
  onCancel,
}: StepViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3">
      {statusPill}

      <div className="flex shrink-0 items-center gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground shadow-md sm:size-12 sm:text-lg"
          aria-hidden
        >
          {stepNumber}
        </span>
        <span className="text-primary">{stepIcon}</span>
        <h2 className="min-w-0 truncate text-[clamp(1.4rem,5vmin,2rem)] font-bold leading-tight tracking-tight text-foreground">
          {stepTitle}
        </h2>
      </div>

      <label
        className="flex min-h-0 shrink-0 flex-col gap-2 rounded-xl border-2 border-dashed border-violet-300/90 bg-card px-4 py-3 shadow-md ring-1 ring-violet-500/10 dark:border-violet-700/55 dark:ring-violet-400/10 sm:px-5 sm:py-4"
      >
        <span className="flex items-center gap-2 text-[clamp(0.7rem,2.2vmin,0.85rem)] font-semibold uppercase tracking-wide text-muted-foreground">
          <ScanLine className="size-4 shrink-0 sm:size-5" aria-hidden />
          Esperando lector USB
        </span>
        <input
          ref={wedgeRef}
          type="text"
          name="kiosk-dsi-wedge"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={wedgeAriaLabel}
          placeholder={wedgePlaceholder}
          className="w-full bg-transparent font-mono text-[clamp(1rem,3.4vmin,1.4rem)] outline-none placeholder:text-muted-foreground"
          onKeyDown={onWedgeKeyDown}
        />
      </label>

      <div className="flex shrink-0 items-center gap-3 text-[clamp(0.65rem,2vmin,0.8rem)] uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span>o escribe manualmente</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Input
          data-kiosk-manual
          readOnly
          inputMode="none"
          placeholder={manualPlaceholder}
          value={manualValue}
          maxLength={manualMaxLength}
          onPointerDown={onManualPointerDown}
          onFocus={(e) => {
            e.currentTarget.blur();
            onManualFocus();
          }}
          onKeyDown={(e) => e.key === "Enter" && onManualSubmit()}
          aria-haspopup="dialog"
          className="h-14 min-h-14 min-w-0 flex-1 cursor-pointer font-mono text-[clamp(1rem,3vmin,1.25rem)] uppercase caret-transparent shadow-sm"
        />
        <Button
          type="button"
          variant="default"
          className="h-14 min-h-14 shrink-0 px-6 text-[clamp(0.9rem,2.8vmin,1.1rem)] font-bold sm:px-7"
          onClick={onManualSubmit}
        >
          OK
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="h-14 min-h-14 shrink-0 px-4 text-[clamp(0.85rem,2.6vmin,1rem)] sm:px-5"
            onClick={onCancel}
            aria-label="Cancelar y volver al paso anterior"
          >
            <X className="size-5 shrink-0" aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ToolPreviewPill({
  loading,
  preview,
}: {
  loading: boolean;
  preview: ToolPreview | null;
}) {
  if (loading) {
    return (
      <PillFrame variant="neutral">
        <Loader2 className="size-5 shrink-0 animate-spin sm:size-6" aria-hidden />
        <span className="text-[clamp(0.85rem,2.6vmin,1rem)] font-medium">Comprobando…</span>
      </PillFrame>
    );
  }
  if (preview?.requiresApproval) {
    return (
      <PillFrame variant="pending">
        <Clock
          className="size-6 shrink-0 text-amber-600 dark:text-amber-400 sm:size-7"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate text-[clamp(0.95rem,2.8vmin,1.15rem)] font-bold text-foreground">
            Requiere aprobación
          </p>
          <p className="truncate text-[clamp(0.7rem,2vmin,0.85rem)] text-muted-foreground">
            Al pasar el carné queda en cola.
          </p>
        </div>
      </PillFrame>
    );
  }
  if (preview) {
    return (
      <PillFrame variant="pass">
        <CheckCircle2
          className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400 sm:size-7"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate text-[clamp(0.95rem,2.8vmin,1.15rem)] font-bold text-foreground">
            Listo para préstamo
          </p>
          <p className="truncate text-[clamp(0.7rem,2vmin,0.85rem)] text-muted-foreground">
            {preview.toolName}
          </p>
        </div>
      </PillFrame>
    );
  }
  return null;
}

function PillFrame({
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
      className={cn(
        "flex shrink-0 items-center gap-3 rounded-xl border-2 px-3 py-2 sm:px-4 sm:py-2.5",
        ring,
      )}
      style={{ backgroundColor: fill }}
    >
      {children}
    </div>
  );
}

function LoadingView() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-border/80 px-6 py-8 shadow-lg animate-fade-in"
      style={{ backgroundColor: getKiteToastFill("neutral") }}
    >
      <Loader2 className="size-14 shrink-0 animate-spin text-primary sm:size-16" aria-hidden />
      <p className="text-[clamp(1.2rem,4vmin,1.6rem)] font-bold tracking-tight text-foreground">
        Procesando…
      </p>
    </div>
  );
}

function ResultView({
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

  const Icon = pass
    ? CheckCircle2
    : pending
      ? Clock
      : result.action === "error" && result.block
        ? Ban
        : XCircle;

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
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-2xl border-2 px-4 py-4 shadow-xl animate-scale-in sm:px-6 sm:py-5",
        borderTone,
      )}
      style={{ backgroundColor: getKiteToastFill(fillKey) }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 gap-4 overflow-hidden">
        <div
          className={cn(
            "flex size-16 shrink-0 items-center justify-center rounded-full shadow-md sm:size-20",
            iconWrap,
          )}
        >
          <Icon className="size-9 sm:size-11" strokeWidth={2.25} aria-hidden />
        </div>

        <div className="min-h-0 min-w-0 flex-1 space-y-1 overflow-hidden sm:space-y-1.5">
          {result.action === "borrowed" && (
            <>
              <h2 className="text-balance text-[clamp(1.4rem,4.4vmin,2rem)] font-bold leading-tight text-foreground">
                Listo · Prestado
              </h2>
              <p className="truncate text-[clamp(1rem,3vmin,1.25rem)] font-semibold text-foreground">
                {result.studentName}
              </p>
              <p className="truncate text-[clamp(0.9rem,2.6vmin,1.1rem)] text-muted-foreground">
                {result.toolName}
              </p>
              <p className="text-[clamp(0.8rem,2.3vmin,1rem)] text-muted-foreground">
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
              <h2 className="text-balance text-[clamp(1.4rem,4.4vmin,2rem)] font-bold leading-tight text-foreground">
                Listo · Devuelto
              </h2>
              <p className="truncate text-[clamp(1rem,3vmin,1.25rem)] font-semibold text-foreground">
                {result.studentName}
              </p>
              <p className="truncate text-[clamp(0.9rem,2.6vmin,1.1rem)] text-muted-foreground">
                {result.toolName}
              </p>
            </>
          )}

          {result.action === "requested" && (
            <>
              <h2 className="text-balance text-[clamp(1.4rem,4.4vmin,2rem)] font-bold leading-tight text-foreground">
                Pendiente
              </h2>
              <p className="truncate text-[clamp(1rem,3vmin,1.25rem)] font-semibold text-foreground">
                {result.studentName}
              </p>
              <p className="truncate text-[clamp(0.9rem,2.6vmin,1.1rem)] text-muted-foreground">
                {result.toolName}
              </p>
              <p className="line-clamp-2 text-[clamp(0.8rem,2.3vmin,1rem)] text-muted-foreground">
                {result.message}
              </p>
            </>
          )}

          {result.action === "conflict" && (
            <>
              <h2 className="text-balance text-[clamp(1.4rem,4.4vmin,2rem)] font-bold leading-tight text-foreground">
                {conflictTitle}
              </h2>
              <p className="line-clamp-3 text-[clamp(0.95rem,2.8vmin,1.15rem)] font-medium text-foreground">
                {result.message}
              </p>
              {result.borrowerName ? (
                <p className="truncate text-[clamp(0.85rem,2.4vmin,1rem)] text-muted-foreground">
                  Con: {result.borrowerName}
                </p>
              ) : null}
            </>
          )}

          {result.action === "error" && result.block && (
            <>
              <h2 className="text-balance text-[clamp(1.4rem,4.4vmin,2rem)] font-bold leading-tight text-foreground">
                Denegado
              </h2>
              <p className="line-clamp-2 text-[clamp(0.95rem,2.8vmin,1.15rem)] font-semibold text-foreground">
                {result.block.reason}
              </p>
              {result.block.isPermanent ? (
                <p className="text-[clamp(0.85rem,2.4vmin,1rem)] font-medium text-foreground">
                  Bloqueo permanente
                </p>
              ) : (
                <p className="text-[clamp(0.85rem,2.4vmin,1rem)] font-medium text-foreground">
                  Temporal{remainingLabel ? ` · ${remainingLabel}` : ""}
                </p>
              )}
              <p className="line-clamp-2 text-[clamp(0.7rem,2vmin,0.85rem)] text-muted-foreground">
                Acude al encargado del laboratorio.
              </p>
            </>
          )}

          {result.action === "error" && !result.block && (
            <>
              <h2 className="text-balance text-[clamp(1.4rem,4.4vmin,2rem)] font-bold leading-tight text-foreground">
                No se pudo
              </h2>
              <p className="line-clamp-3 text-[clamp(0.95rem,2.8vmin,1.15rem)] font-medium text-foreground">
                {result.message}
              </p>
            </>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-auto h-16 min-h-16 w-full shrink-0 gap-2 border-2 bg-background/90 text-[clamp(1rem,3vmin,1.25rem)] font-bold"
        onClick={onReset}
      >
        <RotateCcw className="size-6 shrink-0" aria-hidden />
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
