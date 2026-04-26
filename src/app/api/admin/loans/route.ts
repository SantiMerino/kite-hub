import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getActiveLoans, getOverdueLoans, getRequestedLoans } from "@/services/loan.service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireRole(["staff", "admin"]);

    const [active, requested, overdue, recent, deniedOrCancelled] = await Promise.all([
      getActiveLoans(),
      getRequestedLoans(),
      getOverdueLoans(),
      prisma.loan.findMany({
        where: { status: "returned" },
        include: {
          tool: true,
          student: { select: { id: true, name: true, cardKey: true } },
        },
        orderBy: { actualReturnDate: "desc" },
        take: 20,
      }),
      prisma.loan.findMany({
        where: { status: { in: ["denied", "cancelled"] } },
        include: {
          tool: true,
          student: { select: { id: true, name: true, cardKey: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 40,
      }),
    ]);

    return NextResponse.json({ active, requested, overdue, recent, deniedOrCancelled });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
