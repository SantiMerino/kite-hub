import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getActiveLoans, getOverdueLoans } from "@/services/loan.service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireRole(["staff", "admin"]);

    const [active, overdue, recent] = await Promise.all([
      getActiveLoans(),
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
    ]);

    return NextResponse.json({ active, overdue, recent });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
