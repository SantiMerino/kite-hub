import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loanOrReturn } from "@/services/loan.service";

const CONDITION_VALUES = ["excellent", "good", "fair", "poor"] as const;

const schema = z.object({
  toolPayload: z.string().min(1),
  cardKey: z.string().min(1),
  conditionOnBorrow: z.enum(CONDITION_VALUES).optional(),
  conditionOnReturn: z.enum(CONDITION_VALUES).optional(),
  notes: z.string().optional(),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const ipMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Kiosk secret auth
  const kioskKey = req.headers.get("x-kiosk-key");
  if (kioskKey !== process.env.KIOSK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const idempotencyKey = req.headers.get("idempotency-key") ?? undefined;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 422 });
  }

  try {
    const result = await loanOrReturn(
      parsed.data.toolPayload,
      parsed.data.cardKey,
      {
        conditionOnBorrow: parsed.data.conditionOnBorrow,
        conditionOnReturn: parsed.data.conditionOnReturn,
        notes: parsed.data.notes,
        idempotencyKey,
      }
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
