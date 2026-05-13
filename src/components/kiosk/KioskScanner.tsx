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
import { cn, isValidCardKey, normalizeCardKey } from "@/lib/utils";
import { kiteError, kiteWarning, getKiteToastFill } from "@/lib/kite-sileo";
import QRCameraModal from "./QRCameraModal";
import OnScreenKeyboard from "./OnScreenKeyboard";

type ManualTarget = "tool" | "card";

/** USB / Netum wedge: strip CR/LF and BOM that some readers append. */
function sanitizeScannerLine(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .trim();
}

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
  const [kbTarget, setKbTarget] = useState<ManualTarget | null>(null);

  const idempotencyKeyRef = useRef<string>("");
  const wedgeInputRef = useRef<HTMLInputElement>(null);
  const wedgeFocusTimerRef = useRef<number | null>(null);

  /**
   * El input wedge (lector USB) sólo debe recapturar foco cuando NO hay teclado
   * en pantalla abierto; de lo contrario el `focus()` periódico robaría los
   * eventos a los inputs manuales y rompería la captura desde el teclado.
   */
  const canWedgeCapture =
    (step === "idle" || step === "tool_scanned") && kbTarget === null;

  const closeKeyboard = useCallback(() => setKbTarget(null), []);

  const reset = useCallback(() => {
    setStep("idle");
    setToolPayload("");
    setCardKey("");
    setResult(null);
    setToolPreview(null);
    setToolPreviewLoading(false);
    setToolManual("");
    setCardManual("");
    setKbTarget(null);
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
      const normalizedPayload = sanitizeScannerLine(payload).toUpperCase();
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
      const key = normalizeCardKey(sanitizeScannerLine(raw));
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
    if (!canWedgeCapture || showToolCamera || showCardCamera) return;
    wedgeFocusTimerRef.current = window.setTimeout(() => {
      wedgeInputRef.current?.focus();
    }, 30);
    return () => {
      if (wedgeFocusTimerRef.current !== null) {
        window.clearTimeout(wedgeFocusTimerRef.current);
        wedgeFocusTimerRef.current = null;
      }
    };
  }, [canWedgeCapture, showToolCamera, showCardCamera, step]);

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

  /**
   * "OK" del teclado virtual. Reutiliza los handlers existentes y siempre cierra
   * el overlay: si la validación falla aparece un toast y el usuario puede
   * volver a tocar el input para reabrirlo manteniendo el valor escrito.
   */
  const submitFromKeyboard = useCallback(() => {
    if (kbTarget === "tool") {
      handleToolManual();
    } else if (kbTarget === "card") {
      void handleCardManual();
    }
    setKbTarget(null);
  }, [kbTarget, handleToolManual, handleCardManual]);

  /** Abre el teclado virtual sin permitir que el input reciba foco DOM. */
  const openKeyboardFor = useCallback(
    (target: ManualTarget) => (e: React.PointerEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.currentTarget.blur();
      setKbTarget(target);
    },
    [],
  );

  const wedgeHelpId = "kiosk-wedge-help";
  const showStepChrome = step !== "loading" && step !== "result";

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden">
      {canWedgeCapture && (
        <div className="shrink-0 space-y-1.5 rounded-xl border border-border bg-card px-2.5 py-2 shadow-sm ring-1 ring-violet-500/15 dark:ring-violet-400/10 sm:rounded-2xl sm:px-3 sm:py-2.5">
          <p id={wedgeHelpId} className="text-pretty text-[clamp(0.65rem,2.2vmin,0.8rem)] leading-snug text-muted-foreground">
            <span className="font-semibold text-foreground">Lector USB</span>
            {step === "idle" ? (
              <> · escanea la herramienta; <span className="font-mono text-foreground">Enter</span> cierra el código.</>
            ) : (
              <> · escanea el carné; mismo cierre con <span className="font-mono text-foreground">Enter</span>.</>
            )}
          </p>
          <input
            ref={wedgeInputRef}
            type="text"
            name="kiosk-wedge-capture"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={wedgeHelpId}
            aria-label={step === "idle" ? "Captura del lector: herramienta" : "Captura del lector: carné"}
            placeholder={
              step === "idle" ? "Paso 1 · herramienta…" : "Paso 2 · carné…"
            }
            className={cn(
              "flex h-11 min-h-11 w-full rounded-lg border-2 border-dashed border-violet-300/90 bg-background px-2 py-1.5 font-mono text-[clamp(0.8rem,2.6vmin,1rem)] shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-violet-700/55 sm:h-12 sm:px-3 sm:py-2",
            )}
            onKeyDown={(e) => {
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
          />
        </div>
      )}

      {showStepChrome ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <KioskStepToast
            stepNumber={1}
            title="Herramienta"
            icon={<QrCode className="size-6 sm:size-7" strokeWidth={2.25} />}
            done={!!toolPayload}
            active={step === "idle"}
            value={toolPayload}
            dimmed={false}
          >
            {step === "idle" && (
              <div className="space-y-2 border-border/80 pt-1 sm:space-y-2.5">
                <p className="dsi-hide text-[clamp(0.65rem,2vmin,0.75rem)] text-muted-foreground">Sin lector: cámara o teclado.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="dsi-hide h-11 min-h-11 w-full gap-2 text-[clamp(0.8rem,2.4vmin,0.95rem)] sm:min-h-12 sm:text-base"
                  onClick={() => setShowToolCamera(true)}
                >
                  <QrCode className="size-5 shrink-0" aria-hidden />
                  Cámara (herramienta)
                </Button>
                <div className="flex gap-2">
                  <Input
                    data-kiosk-manual
                    readOnly
                    inputMode="none"
                    placeholder="Toca aquí · ej. MAR_001"
                    value={toolManual}
                    onPointerDown={openKeyboardFor("tool")}
                    onFocus={(e) => {
                      e.currentTarget.blur();
                      setKbTarget("tool");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleToolManual()}
                    aria-haspopup="dialog"
                    className="h-11 min-h-11 min-w-0 flex-1 cursor-pointer font-mono text-[clamp(0.8rem,2.4vmin,0.95rem)] uppercase caret-transparent sm:h-12 sm:text-base"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 shrink-0 px-4 text-[clamp(0.8rem,2.4vmin,0.95rem)] sm:h-12 sm:px-5 sm:text-base"
                    onClick={handleToolManual}
                  >
                    OK
                  </Button>
                </div>
              </div>
            )}
          </KioskStepToast>

          <KioskStepToast
            stepNumber={2}
            title="Carné"
            icon={<CreditCard className="size-6 sm:size-7" strokeWidth={2.25} />}
            done={!!cardKey}
            active={step === "tool_scanned"}
            value={cardKey}
            dimmed={step === "idle"}
          >
            {step === "tool_scanned" && (
              <div className="space-y-2 pt-1 sm:space-y-2.5">
                {toolPreviewLoading && (
                  <StatusPill variant="neutral">
                    <Loader2 className="size-4 shrink-0 animate-spin sm:size-5" aria-hidden />
                    <span className="text-[clamp(0.8rem,2.4vmin,0.95rem)] font-medium">Comprobando…</span>
                  </StatusPill>
                )}
                {!toolPreviewLoading && toolPreview?.requiresApproval && (
                  <StatusPill variant="pending">
                    <Clock className="size-5 shrink-0 text-amber-600 dark:text-amber-400 sm:size-6" aria-hidden />
                    <div className="min-w-0 text-left">
                      <p className="text-[clamp(0.85rem,2.5vmin,1rem)] font-bold text-foreground">Requiere aprobación</p>
                      <p className="text-[clamp(0.65rem,2vmin,0.75rem)] text-muted-foreground">Queda en cola al pasar carné.</p>
                    </div>
                  </StatusPill>
                )}
                {!toolPreviewLoading && !toolPreview?.requiresApproval && toolPreview && (
                  <StatusPill variant="pass">
                    <CheckCircle2
                      className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 sm:size-6"
                      aria-hidden
                    />
                    <div className="min-w-0 text-left">
                      <p className="text-[clamp(0.85rem,2.5vmin,1rem)] font-bold text-foreground">Listo para préstamo</p>
                      <p className="text-[clamp(0.65rem,2vmin,0.75rem)] text-muted-foreground">Sin aprobación previa.</p>
                    </div>
                  </StatusPill>
                )}
                <p className="dsi-hide text-[clamp(0.65rem,2vmin,0.75rem)] text-muted-foreground">Sin lector: cámara o teclado.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="dsi-hide h-11 min-h-11 w-full gap-2 text-[clamp(0.8rem,2.4vmin,0.95rem)] sm:min-h-12 sm:text-base"
                  onClick={() => setShowCardCamera(true)}
                >
                  <QrCode className="size-5 shrink-0" aria-hidden />
                  Cámara (carné)
                </Button>
                <div className="flex gap-2">
                  <Input
                    data-kiosk-manual
                    readOnly
                    inputMode="none"
                    placeholder="Toca aquí · KEY_000000"
                    value={cardManual}
                    onPointerDown={openKeyboardFor("card")}
                    onFocus={(e) => {
                      e.currentTarget.blur();
                      setKbTarget("card");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && void handleCardManual()}
                    aria-haspopup="dialog"
                    className="h-11 min-h-11 min-w-0 flex-1 cursor-pointer font-mono text-[clamp(0.8rem,2.4vmin,0.95rem)] uppercase caret-transparent sm:h-12 sm:text-base"
                    maxLength={10}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 shrink-0 px-4 text-[clamp(0.8rem,2.4vmin,0.95rem)] sm:h-12 sm:px-5 sm:text-base"
                    onClick={() => void handleCardManual()}
                  >
                    OK
                  </Button>
                </div>
              </div>
            )}
          </KioskStepToast>
        </div>
      ) : null}

      {step === "loading" && (
        <div
          className="flex min-h-0 flex-1 shrink-0 flex-col items-center justify-center gap-3 rounded-xl border border-border/80 px-4 py-6 shadow-lg animate-fade-in sm:rounded-2xl sm:py-8"
          style={{ backgroundColor: getKiteToastFill("neutral") }}
        >
          <Loader2 className="size-10 shrink-0 text-primary animate-spin sm:size-12" aria-hidden />
          <p className="text-[clamp(1rem,3.2vmin,1.25rem)] font-semibold text-foreground">Procesando…</p>
        </div>
      )}

      {step === "result" && result && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <KioskResultToast result={result} onReset={reset} />
        </div>
      )}

      {showToolCamera && (
        <QRCameraModal title="Herramienta" onScan={handleToolScanned} onClose={() => setShowToolCamera(false)} />
      )}
      {showCardCamera && (
        <QRCameraModal title="Carné" onScan={handleCardScanned} onClose={() => setShowCardCamera(false)} />
      )}

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
      className={`rounded-xl border px-3 py-3 shadow-lg transition-all sm:rounded-2xl sm:px-4 sm:py-4 ${
        done
          ? "border-emerald-300/90 dark:border-emerald-700/50"
          : active
            ? "border-border ring-2 ring-primary/25"
            : "border-border/70"
      } ${showDim ? "pointer-events-none bg-muted/40 opacity-50" : ""}`}
      style={!showDim ? { backgroundColor: bg } : undefined}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold sm:size-11 sm:text-lg ${
            done
              ? "bg-emerald-500! text-white"
              : active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {done ? <CheckCircle2 className="size-6 sm:size-7" strokeWidth={2.5} aria-hidden /> : stepNumber}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="shrink-0 text-primary">{icon}</div>
          <span className="truncate text-[clamp(0.95rem,3vmin,1.15rem)] font-bold text-foreground">{title}</span>
          {done && value ? (
            <span className="ml-auto max-w-[42%] truncate font-mono text-[clamp(0.65rem,2vmin,0.85rem)] text-muted-foreground sm:max-w-[45%] sm:text-sm">
              {value}
            </span>
          ) : null}
        </div>
      </div>
      {children ? <div className="mt-2 pl-0 sm:mt-3 sm:pl-11">{children}</div> : null}
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
      className={`flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 sm:gap-3 sm:rounded-xl sm:px-3 sm:py-2.5 ${ring}`}
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
      className={`flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden rounded-xl border-2 px-3 py-3 text-left shadow-xl animate-scale-in sm:rounded-2xl sm:px-4 sm:py-4 ${borderTone}`}
      style={{ backgroundColor: getKiteToastFill(fillKey) }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 gap-2.5 overflow-hidden sm:gap-3">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-full shadow-md sm:size-14 ${iconWrap}`}
        >
          <Icon className="size-7 sm:size-8" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="min-h-0 min-w-0 flex-1 space-y-1 overflow-hidden sm:space-y-1.5">
          {result.action === "borrowed" && (
            <>
              <h2 className="text-balance text-[clamp(1rem,3.4vmin,1.5rem)] font-bold leading-tight text-foreground">
                Listo · Prestado
              </h2>
              <p className="text-pretty text-[clamp(0.85rem,2.8vmin,1.1rem)] font-semibold text-foreground">
                {result.studentName}
                <span className="font-normal text-muted-foreground"> · </span>
                {result.toolName}
              </p>
              <p className="text-pretty text-[clamp(0.7rem,2.3vmin,0.9rem)] text-muted-foreground">
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
              <h2 className="text-balance text-[clamp(1rem,3.4vmin,1.5rem)] font-bold leading-tight text-foreground">
                Listo · Devuelto
              </h2>
              <p className="text-pretty text-[clamp(0.85rem,2.8vmin,1.1rem)] font-semibold text-foreground">
                {result.studentName}
                <span className="font-normal text-muted-foreground"> · </span>
                {result.toolName}
              </p>
            </>
          )}

          {result.action === "requested" && (
            <>
              <h2 className="text-balance text-[clamp(1rem,3.4vmin,1.5rem)] font-bold leading-tight text-foreground">
                Pendiente
              </h2>
              <p className="text-pretty text-[clamp(0.85rem,2.8vmin,1.1rem)] font-semibold text-foreground">
                {result.studentName}
                <span className="font-normal text-muted-foreground"> · </span>
                {result.toolName}
              </p>
              <p className="line-clamp-3 text-pretty text-[clamp(0.7rem,2.3vmin,0.9rem)] text-muted-foreground">
                {result.message}
              </p>
            </>
          )}

          {result.action === "conflict" && (
            <>
              <h2 className="text-balance text-[clamp(1rem,3.4vmin,1.5rem)] font-bold leading-tight text-foreground">
                {conflictTitle}
              </h2>
              <p className="line-clamp-3 text-pretty text-[clamp(0.8rem,2.6vmin,1rem)] font-medium text-foreground">
                {result.message}
              </p>
              {result.borrowerName ? (
                <p className="truncate text-[clamp(0.7rem,2.3vmin,0.9rem)] text-muted-foreground">
                  Con: {result.borrowerName}
                </p>
              ) : null}
            </>
          )}

          {result.action === "error" && result.block && (
            <>
              <h2 className="text-balance text-[clamp(1rem,3.4vmin,1.5rem)] font-bold leading-tight text-foreground">
                Denegado
              </h2>
              <p className="line-clamp-2 text-pretty text-[clamp(0.8rem,2.6vmin,1rem)] font-semibold text-foreground">
                {result.block.reason}
              </p>
              {result.block.isPermanent ? (
                <p className="text-[clamp(0.75rem,2.4vmin,0.95rem)] font-medium text-foreground">Bloqueo permanente</p>
              ) : (
                <p className="text-[clamp(0.75rem,2.4vmin,0.95rem)] font-medium text-foreground">
                  Temporal{remainingLabel ? ` · ${remainingLabel}` : ""}
                </p>
              )}
              <p className="line-clamp-2 text-[clamp(0.65rem,2vmin,0.8rem)] text-muted-foreground">
                Acude al encargado del laboratorio para aclaraciones.
              </p>
            </>
          )}

          {result.action === "error" && !result.block && (
            <>
              <h2 className="text-balance text-[clamp(1rem,3.4vmin,1.5rem)] font-bold leading-tight text-foreground">
                No se pudo
              </h2>
              <p className="line-clamp-4 text-pretty text-[clamp(0.8rem,2.6vmin,1rem)] font-medium text-foreground">
                {result.message}
              </p>
            </>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-auto h-12 min-h-12 w-full shrink-0 gap-2 border-2 bg-background/90 text-[clamp(0.85rem,2.6vmin,1rem)] font-semibold sm:h-14 sm:min-h-14 sm:text-lg"
        onClick={onReset}
      >
        <RotateCcw className="size-5 shrink-0" aria-hidden />
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
