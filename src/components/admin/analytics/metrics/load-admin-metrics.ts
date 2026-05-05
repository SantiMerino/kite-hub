import { prisma } from "@/lib/prisma";
import { buildMetricsKpis } from "./constants";
import type { TopToolMetric } from "./types";

export type AdminMetricsBundle = {
  kpis: ReturnType<typeof buildMetricsKpis>;
  topTools: TopToolMetric[];
  summary: {
    totalLoans30d: number;
    returnedLoans30d: number;
    overdueLoans: number;
    sanctionCount: number;
    returnRate: number;
  };
};

export async function loadAdminMetrics(): Promise<AdminMetricsBundle> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    activeLoans,
    overdueLoans,
    totalLoans30d,
    returnedLoans30d,
    pendingAlerts,
    topToolsRaw,
    sanctionCount,
  ] = await Promise.all([
    prisma.loan.count({ where: { status: "active" } }),
    prisma.loan.count({ where: { status: "overdue" } }),
    prisma.loan.count({ where: { borrowDate: { gte: thirtyDaysAgo } } }),
    prisma.loan.count({
      where: { status: "returned", borrowDate: { gte: thirtyDaysAgo } },
    }),
    prisma.alert.count({ where: { status: "pending" } }),
    prisma.loan.groupBy({
      by: ["toolId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.sanction.count({ where: { status: "active" } }),
  ]);

  const toolIds = topToolsRaw.map((tool) => tool.toolId);
  const toolNames = await prisma.tool.findMany({
    where: { id: { in: toolIds } },
    select: { id: true, name: true },
  });
  const toolMap = Object.fromEntries(toolNames.map((tool) => [tool.id, tool.name]));

  const topTools: TopToolMetric[] = topToolsRaw.map((tool) => ({
    name: toolMap[tool.toolId] ?? `ID ${tool.toolId}`,
    count: tool._count.id,
  }));

  const returnRate =
    totalLoans30d > 0 ? Math.round((returnedLoans30d / totalLoans30d) * 100) : 0;

  const kpis = buildMetricsKpis({
    activeLoans,
    overdueLoans,
    returnRate,
    pendingAlerts,
    sanctionCount,
  });

  return {
    kpis,
    topTools,
    summary: {
      totalLoans30d,
      returnedLoans30d,
      overdueLoans,
      sanctionCount,
      returnRate,
    },
  };
}
