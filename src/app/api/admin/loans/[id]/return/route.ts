import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { adminReturnLoan } from "@/services/loan.service";

const schema = z.object({
  conditionOnReturn: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["staff", "admin"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 422 });
    await adminReturnLoan(Number(id), actor.id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
