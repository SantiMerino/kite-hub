import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { approveLoan } from "@/services/loan.service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["staff", "admin"]);
    const { id } = await params;
    await approveLoan(Number(id), actor.id);
    return NextResponse.json({ success: true });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    const message = res instanceof Error ? res.message : "Error approving loan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
