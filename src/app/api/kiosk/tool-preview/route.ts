import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getKioskToolPreview } from "@/services/loan.service";

const schema = z.object({
  toolPayload: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const kioskKey = req.headers.get("x-kiosk-key");
  if (kioskKey !== process.env.KIOSK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const preview = await getKioskToolPreview(parsed.data.toolPayload);
    return NextResponse.json(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
