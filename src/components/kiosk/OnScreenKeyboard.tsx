"use client";

import { useCallback, useEffect } from "react";
import { Delete, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Teclado virtual embebido para el kiosko Kite Hub.
 *
 * Diseñado para una pantalla DSI 5" (800×480) bajo Chromium en modo --kiosk,
 * donde un teclado del SO (wvkbd, onboard) puede reservar una *exclusive zone*
 * en Wayland y recortar la página. Al renderizarse dentro de la propia app:
 *   - se ignora la capa del compositor,
 *   - se gestiona el foco vía estado controlado (no DOM focus),
 *   - se respetan tokens del design system (background, border, primary…).
 *
 * Sólo emite mayúsculas y `_` (los IDs Kite son `MAR_001`, `KEY_000000`).
 */
export type OnScreenKeyboardProps = {
  open: boolean;
  /** Etiqueta corta arriba del valor (ej. "Herramienta", "Carné"). */
  label: string;
  /** Valor actual del input controlado. */
  value: string;
  /** Texto auxiliar mientras `value` está vacío. */
  placeholder?: string;
  /** Setter del valor. Recibe siempre la cadena ya en mayúsculas. */
  onChange: (next: string) => void;
  /** "OK" del teclado. */
  onSubmit: () => void;
  /** Cierre por scrim, [X] o Escape físico. */
  onClose: () => void;
  /** Tope máximo del valor (ej. 10 para `KEY_000000`). */
  maxLength?: number;
};

const ROW_1 = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;
const ROW_2 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"] as const;
const ROW_3 = ["A", "S", "D", "F", "G", "H", "J", "K", "L", "_"] as const;
const ROW_4 = ["Z", "X", "C", "V", "B", "N", "M"] as const;

export default function OnScreenKeyboard({
  open,
  label,
  value,
  placeholder,
  onChange,
  onSubmit,
  onClose,
  maxLength,
}: OnScreenKeyboardProps) {
  const pressKey = useCallback(
    (key: string) => {
      if (maxLength != null && value.length >= maxLength) return;
      onChange((value + key).toUpperCase());
    },
    [maxLength, onChange, value],
  );

  const pressBackspace = useCallback(() => {
    if (!value) return;
    onChange(value.slice(0, -1));
  }, [onChange, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Teclado en pantalla — ${label}`}
    >
      <button
        type="button"
        aria-label="Cerrar teclado"
        className="flex-1 cursor-default bg-foreground/35 backdrop-blur-[1px]"
        onPointerDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      <div
        className="shrink-0 border-t-2 border-border bg-card px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl animate-slide-up sm:px-3 sm:pt-3"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 shadow-xs">
          <span className="shrink-0 text-[clamp(0.6rem,1.8vmin,0.75rem)] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-mono text-[clamp(0.95rem,3vmin,1.2rem)]",
              value ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {value || placeholder || "\u00A0"}
          </span>
          <button
            type="button"
            aria-label="Cerrar"
            className="ml-1 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground transition active:scale-[0.97] hover:bg-muted sm:size-10"
            onPointerDown={(e) => {
              e.preventDefault();
              onClose();
            }}
          >
            <X className="size-5 shrink-0" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-10 gap-1.5 select-none">
          {ROW_1.map((k) => (
            <Key key={`r1-${k}`} char={k} onPress={pressKey} />
          ))}
          {ROW_2.map((k) => (
            <Key key={`r2-${k}`} char={k} onPress={pressKey} />
          ))}
          {ROW_3.map((k) => (
            <Key key={`r3-${k}`} char={k} onPress={pressKey} />
          ))}
          {ROW_4.map((k) => (
            <Key key={`r4-${k}`} char={k} onPress={pressKey} />
          ))}
          <Key
            char="⌫"
            ariaLabel="Borrar"
            tone="muted"
            onPressVoid={pressBackspace}
            icon={<Delete className="size-5 shrink-0" aria-hidden />}
          />
          <Key
            char="OK"
            ariaLabel="Enviar"
            tone="primary"
            colSpan={2}
            onPressVoid={onSubmit}
          />
        </div>
      </div>
    </div>
  );
}

type KeyProps = {
  char: string;
  ariaLabel?: string;
  tone?: "default" | "muted" | "primary";
  colSpan?: 1 | 2;
  icon?: React.ReactNode;
} & (
  | { onPress: (char: string) => void; onPressVoid?: never }
  | { onPress?: never; onPressVoid: () => void }
);

function Key({
  char,
  ariaLabel,
  tone = "default",
  colSpan = 1,
  icon,
  onPress,
  onPressVoid,
}: KeyProps) {
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (onPress) onPress(char);
    else if (onPressVoid) onPressVoid();
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? char}
      onPointerDown={handlePointerDown}
      className={cn(
        "flex h-[clamp(2.5rem,8.5vmin,3.25rem)] min-h-11 items-center justify-center rounded-md border text-[clamp(0.9rem,3.2vmin,1.15rem)] font-semibold shadow-xs transition-[transform,background] active:scale-[0.97]",
        colSpan === 2 && "col-span-2",
        tone === "default" &&
          "border-border bg-background text-foreground hover:bg-muted",
        tone === "muted" &&
          "border-border bg-muted text-foreground hover:bg-muted/80",
        tone === "primary" &&
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      {icon ?? char}
    </button>
  );
}
