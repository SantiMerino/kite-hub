/**
 * kite-sileo.ts
 *
 * Domain-specific helpers wrapping `sileo`.
 * Toast `fill` uses CSS variables (--kite-fill-*) defined in globals.css so
 * backgrounds follow `.dark` on <html> immediately (no stale inline colors).
 */

import { sileo, type SileoOptions } from "sileo";

// ─── Fill tokens: hex values live in globals.css (:root / .dark) ──────────────

const KITE_FILL_VARS = {
  success: "var(--kite-fill-success)",
  error:   "var(--kite-fill-error)",
  warning: "var(--kite-fill-warning)",
  info:    "var(--kite-fill-info)",
  neutral: "var(--kite-fill-neutral)",
} as const;

export type KiteToastFillKey = keyof typeof KITE_FILL_VARS;

function fill(type: KiteToastFillKey): string {
  return KITE_FILL_VARS[type];
}

/** Mismo relleno que Sileo; usa variables CSS (responde al tema al instante). */
export function getKiteToastFill(type: KiteToastFillKey): string {
  return fill(type);
}

// ─── Badge (icon badge) colors ────────────────────────────────────────────────

const BADGE: Record<KiteToastFillKey, string> = {
  success: "bg-emerald-500! text-white!",
  error:   "bg-red-500! text-white!",
  warning: "bg-amber-400! text-amber-950!",
  info:    "bg-blue-500! text-white!",
  neutral: "bg-muted! text-foreground!",
};

// ─── Base styles shared by all helpers ────────────────────────────────────────

function baseStyles(type: KiteToastFillKey): SileoOptions["styles"] {
  return {
    title: "text-foreground! font-semibold!",
    description: "text-muted-foreground! text-xs!",
    badge: BADGE[type],
  };
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export type KiteToastOptions = Pick<
  SileoOptions,
  "title" | "description" | "duration" | "icon" | "position"
>;

/** Green — operación completada correctamente. */
export function kiteSuccess(opts: KiteToastOptions): string {
  return sileo.success({
    duration: 5000,
    fill: fill("success"),
    styles: baseStyles("success"),
    ...opts,
  });
}

/** Rojo — fallo de red, 4xx/5xx, validación del servidor. */
export function kiteError(opts: KiteToastOptions): string {
  return sileo.error({
    duration: 7000,
    fill: fill("error"),
    styles: baseStyles("error"),
    ...opts,
  });
}

/** Ámbar — situación delicada o acción con consecuencias (cancelar, eliminar). */
export function kiteWarning(opts: KiteToastOptions): string {
  return sileo.warning({
    duration: 6000,
    fill: fill("warning"),
    styles: baseStyles("warning"),
    ...opts,
  });
}

/** Azul — información contextual neutra. */
export function kiteInfo(opts: KiteToastOptions): string {
  return sileo.info({
    duration: 5000,
    fill: fill("info"),
    styles: baseStyles("info"),
    ...opts,
  });
}

/**
 * Envuelve una promesa con un flujo loading → success → error.
 * Devuelve la misma promesa para poder awaitar si hace falta.
 */
export function kitePromise<T>(
  promise: Promise<T>,
  opts: {
    loading: KiteToastOptions;
    success: KiteToastOptions | ((data: T) => KiteToastOptions);
    error:   KiteToastOptions | ((err: unknown) => KiteToastOptions);
  },
): Promise<T> {
  const resolve = (base: KiteToastOptions | ((d: T) => KiteToastOptions)) =>
    typeof base === "function"
      ? (data: T): SileoOptions => ({
          fill: fill("success"),
          styles: baseStyles("success"),
          ...(base as (d: T) => KiteToastOptions)(data),
        })
      : { fill: fill("success"), styles: baseStyles("success"), ...base };

  const reject = (base: KiteToastOptions | ((e: unknown) => KiteToastOptions)) =>
    typeof base === "function"
      ? (err: unknown): SileoOptions => ({
          fill: fill("error"),
          styles: baseStyles("error"),
          ...(base as (e: unknown) => KiteToastOptions)(err),
        })
      : { fill: fill("error"), styles: baseStyles("error"), ...base };

  return sileo.promise(promise, {
    loading: {
      fill: fill("neutral"),
      styles: baseStyles("neutral"),
      ...opts.loading,
    },
    success: resolve(opts.success),
    error:   reject(opts.error),
  }) as Promise<T>;
}

/**
 * Toast con botón de acción (p. ej. "Ver auditoría del carné").
 * El `button.onClick` debe cerrar/redirigir el propio flujo.
 */
export function kiteAction(
  opts: KiteToastOptions & { button: { title: string; onClick: () => void } },
): string {
  return sileo.action({
    duration: 8000,
    fill: fill("info"),
    styles: baseStyles("info"),
    ...opts,
  });
}
