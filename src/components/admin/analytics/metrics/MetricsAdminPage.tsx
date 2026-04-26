import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsChart } from "@/components/charts/MetricsChart";
import { buildMetricsKpis } from "./constants";
import MetricsKpiGrid from "./components/MetricsKpiGrid";
import MetricsSummaryTable from "./components/MetricsSummaryTable";
import { TopToolMetric } from "./types";

export default async function MetricsAdminPage() {
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
    prisma.loan.count({ where: { status: "returned", borrowDate: { gte: thirtyDaysAgo } } }),
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
  const returnRate = totalLoans30d > 0 ? Math.round((returnedLoans30d / totalLoans30d) * 100) : 0;

  const kpis = buildMetricsKpis({
    activeLoans,
    overdueLoans,
    returnRate,
    pendingAlerts,
    sanctionCount,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Metricas</h1>
        <p className="text-muted-foreground text-sm">Estadisticas de uso del laboratorio.</p>
      </div>

      <MetricsKpiGrid kpis={kpis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Herramientas mas solicitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsChart data={topTools} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumen ultimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsSummaryTable
              totalLoans30d={totalLoans30d}
              returnedLoans30d={returnedLoans30d}
              overdueLoans={overdueLoans}
              sanctionCount={sanctionCount}
              returnRate={returnRate}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
