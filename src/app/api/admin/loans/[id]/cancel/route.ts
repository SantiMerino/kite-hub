import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { cancelLoan } from "@/services/loan.service";

const schema = z.object({
  reason: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["staff", "admin"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 422 });
    }
    await cancelLoan(Number(id), actor.id, parsed.data.reason);
    return NextResponse.json({ success: true });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    const message = res instanceof Error ? res.message : "Error canceling loan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
