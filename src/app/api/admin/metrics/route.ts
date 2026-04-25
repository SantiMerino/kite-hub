import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireRole(["staff", "admin"]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      activeLoans,
      overdueLoans,
      totalLoans30d,
      returnedOnTime30d,
      pendingAlerts,
      topTools,
      loansByDay,
      sanctionCount,
    ] = await Promise.all([
      prisma.loan.count({ where: { status: "active" } }),
      prisma.loan.count({ where: { status: "overdue" } }),
      prisma.loan.count({ where: { borrowDate: { gte: thirtyDaysAgo } } }),
      prisma.loan.count({
        where: {
          status: "returned",
          borrowDate: { gte: thirtyDaysAgo },
          actualReturnDate: { not: null },
        },
      }),
      prisma.alert.count({ where: { status: "pending" } }),
      prisma.loan.groupBy({
        by: ["toolId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.$queryRaw<{ day: Date; count: number }[]>`
        SELECT CAST(borrowDate AS DATE) as day, COUNT(*) as count
        FROM loans
        WHERE borrowDate >= ${thirtyDaysAgo}
        GROUP BY CAST(borrowDate AS DATE)
        ORDER BY day ASC
      `,
      prisma.sanction.count({ where: { status: "active" } }),
    ]);

    // Hydrate top tools with names
    const toolIds = topTools.map((t) => t.toolId);
    const toolNames = await prisma.tool.findMany({
      where: { id: { in: toolIds } },
      select: { id: true, name: true, toolId: true },
    });
    const toolMap = Object.fromEntries(toolNames.map((t) => [t.id, t]));

    const topToolsHydrated = topTools.map((t) => ({
      tool: toolMap[t.toolId],
      count: t._count.id,
    }));

    return NextResponse.json({
      activeLoans,
      overdueLoans,
      totalLoans30d,
      returnedOnTime30d,
      returnRate: totalLoans30d > 0 ? Math.round((returnedOnTime30d / totalLoans30d) * 100) : 0,
      pendingAlerts,
      sanctionCount,
      topTools: topToolsHydrated,
      loansByDay,
    });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
