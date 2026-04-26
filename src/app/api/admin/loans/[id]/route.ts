import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteLoan } from "@/services/loan.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["staff", "admin"]);
    const { id } = await params;
    const loan = await prisma.loan.findUnique({
      where: { id: Number(id) },
      include: {
        tool: true,
        student: { select: { id: true, name: true, cardKey: true, email: true } },
        sanctions: true,
      },
    });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }
    return NextResponse.json(loan);
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await params;
    await deleteLoan(Number(id), actor.id);
    return NextResponse.json({ success: true });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    const message = res instanceof Error ? res.message : "Error deleting loan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
