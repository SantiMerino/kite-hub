"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { QrCode, CreditCard, CheckCircle2, XCircle, AlertCircle, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidCardKey, normalizeCardKey } from "@/lib/utils";
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
        appealMessage: string;
      };
    };

export default function KioskScanner() {
  const kioskPublicKey = process.env.NEXT_PUBLIC_KIOSK_KEY ?? "";
  const [step, setStep] = useState<Step>("idle");
  const [toolPayload, setToolPayload] = useState("");
  const [cardKey, setCardKey] = useState("");
  const [result, setResult] = useState<ResultType | null>(null);
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
    setToolManual("");
    setCardManual("");
    idempotencyKeyRef.current = "";
  }, []);

  const handleToolScanned = useCallback((payload: string) => {
    setToolPayload(payload.trim().toUpperCase());
    setShowToolCamera(false);
    setStep("tool_scanned");
  }, []);

  const handleToolManual = useCallback(() => {
    const val = toolManual.trim().toUpperCase();
    if (!val) return;
    handleToolScanned(val);
  }, [toolManual, handleToolScanned]);

  const handleCardScanned = useCallback(async (raw: string) => {
    const key = normalizeCardKey(raw);
    setShowCardCamera(false);

    if (!isValidCardKey(key)) {
      setResult({ action: "error", message: `Formato de carné inválido: ${key}. Se esperaba KEY_XXXXXX.` });
      setStep("result");
      return;
    }

    setCardKey(key);
    await submitLoanOrReturn(toolPayload, key);
  }, [toolPayload]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardManual = useCallback(async () => {
    const key = normalizeCardKey(cardManual);
    if (!isValidCardKey(key)) {
      setResult({ action: "error", message: `Formato de carné inválido. Usa el formato KEY_000000.` });
      setStep("result");
      return;
    }
    setCardKey(key);
    await submitLoanOrReturn(toolPayload, key);
  }, [cardManual, toolPayload]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitLoanOrReturn = useCallback(async (tool: string, card: string) => {
    if (!kioskPublicKey) {
      setResult({
        action: "error",
        message: "Falta NEXT_PUBLIC_KIOSK_KEY en el entorno de desarrollo. Configúrala para usar el kiosk.",
      });
      setStep("result");
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
      setResult({ action: "error", message: "No se pudo conectar con el servidor. Intenta de nuevo." });
    }

    setStep("result");
  }, [kioskPublicKey]);

  return (
    <div className="w-full space-y-4">
      {/* ── Step 1: Tool scan ─────────────────────────────────── */}
      <StepCard
        stepNumber={1}
        title="Herramienta"
        icon={<QrCode className="size-5" />}
        done={!!toolPayload}
        active={step === "idle"}
        value={toolPayload}
        color="blue"
      >
        {step === "idle" && (
          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => setShowToolCamera(true)}
            >
              <QrCode className="size-4" />
              Escanear QR de herramienta
            </Button>
            <div className="flex gap-2">
              <Input
                placeholder="Ingresa ID manual (MAR_001)"
                value={toolManual}
                onChange={(e) => setToolManual(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleToolManual()}
                className="font-mono uppercase"
              />
              <Button variant="outline" onClick={handleToolManual}>OK</Button>
            </div>
          </div>
        )}
      </StepCard>

      {/* ── Step 2: Card scan ─────────────────────────────────── */}
      <StepCard
        stepNumber={2}
        title="Carné estudiantil"
        icon={<CreditCard className="size-5" />}
        done={!!cardKey}
        active={step === "tool_scanned"}
        value={cardKey}
        color="violet"
      >
        {step === "tool_scanned" && (
          <div className="space-y-3">
            <Button
              className="w-full bg-violet-600 hover:bg-violet-700"
              size="lg"
              onClick={() => setShowCardCamera(true)}
            >
              <QrCode className="size-4" />
              Escanear QR del carné
            </Button>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="card-manual" className="text-xs text-muted-foreground">
                  Ingresa tu carné manualmente
                </Label>
                <Input
                  id="card-manual"
                  placeholder="KEY_000000"
                  value={cardManual}
                  onChange={(e) => setCardManual(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleCardManual()}
                  className="font-mono uppercase"
                  maxLength={10}
                />
              </div>
              <Button variant="outline" className="self-end" onClick={handleCardManual}>OK</Button>
            </div>
          </div>
        )}
      </StepCard>

      {/* ── Loading ───────────────────────────────────────────── */}
      {step === "loading" && (
        <div className="flex flex-col items-center gap-3 py-8 animate-fade-in">
          <Loader2 className="size-8 text-violet-600 animate-spin" />
          <p className="text-sm text-muted-foreground">Procesando…</p>
        </div>
      )}

      {/* ── Result ────────────────────────────────────────────── */}
      {step === "result" && result && (
        <ResultCard result={result} onReset={reset} />
      )}

      {/* ── Camera modals ─────────────────────────────────────── */}
      {showToolCamera && (
        <QRCameraModal
          title="Escanear herramienta"
          onScan={handleToolScanned}
          onClose={() => setShowToolCamera(false)}
        />
      )}
      {showCardCamera && (
        <QRCameraModal
          title="Escanear carné"
          onScan={handleCardScanned}
          onClose={() => setShowCardCamera(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepCard({
  stepNumber,
  title,
  icon,
  done,
  active,
  value,
  color,
  children,
}: {
  stepNumber: number;
  title: string;
  icon: React.ReactNode;
  done: boolean;
  active: boolean;
  value: string;
  color: "blue" | "violet";
  children?: React.ReactNode;
}) {
  const colorMap = {
    blue: {
      border: done ? "border-blue-300" : active ? "border-blue-400" : "border-border",
      bg: done ? "bg-blue-50" : active ? "bg-white" : "bg-muted/30",
      num: done ? "bg-blue-600 text-white" : active ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground",
      icon: "text-blue-600",
    },
    violet: {
      border: done ? "border-violet-300" : active ? "border-violet-400" : "border-border",
      bg: done ? "bg-violet-50" : active ? "bg-white" : "bg-muted/30",
      num: done ? "bg-violet-600 text-white" : active ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground",
      icon: "text-violet-600",
    },
  };

  const c = colorMap[color];

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all ${c.border} ${c.bg} ${active ? "shadow-sm" : ""}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`size-7 rounded-full flex items-center justify-center text-sm font-bold ${c.num}`}>
          {done ? "✓" : stepNumber}
        </div>
        <div className={c.icon}>{icon}</div>
        <span className="font-semibold text-sm">{title}</span>
        {done && value && (
          <span className="ml-auto font-mono text-xs text-muted-foreground truncate max-w-[120px]">
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ResultCard({
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

  const isPosive =
    result.action === "borrowed" ||
    result.action === "returned" ||
    result.action === "requested";
  const isConflict = result.action === "conflict";
  const isBlocked = result.action === "error" && Boolean(result.block);
  const isError = result.action === "error" && !result.block;
  const remainingLabel =
    result.action === "error" && result.block?.endsAt
      ? formatRemainingMs(new Date(result.block.endsAt).getTime() - now)
      : null;

  return (
    <div
      className={`rounded-xl border-2 p-6 animate-scale-in text-center ${
        isPosive
          ? "border-emerald-300 bg-emerald-50"
          : isConflict
          ? "border-amber-300 bg-amber-50"
          : isBlocked
          ? "border-purple-300 bg-purple-50"
          : "border-red-300 bg-red-50"
      }`}
    >
      {isPosive && <CheckCircle2 className="size-12 text-emerald-600 mx-auto mb-3" />}
      {isConflict && <AlertCircle className="size-12 text-amber-600 mx-auto mb-3" />}
      {isBlocked && <AlertCircle className="size-12 text-purple-600 mx-auto mb-3" />}
      {isError && <XCircle className="size-12 text-red-600 mx-auto mb-3" />}

      {result.action === "borrowed" && (
        <>
          <h2 className="text-lg font-bold text-emerald-800 mb-1">¡Préstamo registrado!</h2>
          <p className="text-sm text-emerald-700 mb-1">
            <strong>{result.studentName}</strong> llevó: <strong>{result.toolName}</strong>
          </p>
          <p className="text-xs text-emerald-600">
            Devuelve antes del{" "}
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
          <h2 className="text-lg font-bold text-emerald-800 mb-1">¡Devolución registrada!</h2>
          <p className="text-sm text-emerald-700">
            <strong>{result.studentName}</strong> devolvió: <strong>{result.toolName}</strong>
          </p>
        </>
      )}

      {result.action === "requested" && (
        <>
          <h2 className="text-lg font-bold text-emerald-800 mb-1">Solicitud registrada</h2>
          <p className="text-sm text-emerald-700 mb-1">
            <strong>{result.studentName}</strong> solicitó: <strong>{result.toolName}</strong>
          </p>
          <p className="text-xs text-emerald-700">{result.message}</p>
        </>
      )}

      {result.action === "conflict" && (
        <>
          <h2 className="text-lg font-bold text-amber-800 mb-1">Herramienta no disponible</h2>
          <p className="text-sm text-amber-700">{result.message}</p>
          {result.borrowerName && (
            <p className="text-xs text-amber-600 mt-1">Prestada a: {result.borrowerName}</p>
          )}
        </>
      )}

      {result.action === "error" && result.block && (
        <>
          <h2 className="text-lg font-bold text-purple-800 mb-1">Préstamo bloqueado</h2>
          <p className="text-sm text-purple-700 mb-1">{result.block.reason}</p>
          {result.block.isPermanent ? (
            <p className="text-xs text-purple-700 font-semibold">Bloqueo permanente</p>
          ) : (
            <p className="text-xs text-purple-700 font-semibold">
              Bloqueo temporal {remainingLabel ? `(${remainingLabel} restantes)` : ""}
            </p>
          )}
          <p className="text-xs text-purple-700 mt-2">{result.block.appealMessage}</p>
        </>
      )}

      {result.action === "error" && !result.block && (
        <>
          <h2 className="text-lg font-bold text-red-800 mb-1">Error</h2>
          <p className="text-sm text-red-700">{result.message}</p>
        </>
      )}

      <Button
        variant="outline"
        className="mt-5 gap-2"
        onClick={onReset}
      >
        <RotateCcw className="size-4" />
        Nuevo préstamo / devolución
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
