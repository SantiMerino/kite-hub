import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function daysUntil(date: Date | string): number {
  const now = new Date();
  const target = new Date(date);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysOverdue(date: Date | string): number {
  return Math.max(0, -daysUntil(date));
}

/** Validates carné format KEY_000000 */
export function isValidCardKey(value: string): boolean {
  return /^KEY_\d{6}$/.test(value.toUpperCase());
}

export function normalizeCardKey(value: string): string {
  return value.trim().toUpperCase();
}

/** Accepts PRE_001 and PRE_ABCD_001 formats. */
export const TOOL_ID_REGEX = /^[A-Z0-9]{3}(?:_[A-Z0-9]{4})?_\d{3}$/;
export const TOOL_ID_EMBEDDED_REGEX = /([A-Z0-9]{3}(?:_[A-Z0-9]{4})?_\d{3})/;

export function isValidToolId(value: string): boolean {
  return TOOL_ID_REGEX.test(value.trim().toUpperCase());
}

export function extractToolIdFromText(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  const match = normalized.match(TOOL_ID_EMBEDDED_REGEX);
  return match?.[1] ?? null;
}
