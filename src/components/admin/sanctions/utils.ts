export function sanitizeCardSuffix(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function buildCardKey(sixDigits: string): string {
  const digits = sixDigits.replace(/\D/g, "").slice(0, 6);
  return `KEY_${digits.padStart(6, "0")}`;
}
