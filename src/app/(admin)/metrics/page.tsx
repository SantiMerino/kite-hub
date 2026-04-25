import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { MetricsChart } from "@/components/charts/MetricsChart";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
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
      where: {
        status: "returned",
        borrowDate: { gte: thirtyDaysAgo },
      },
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

  const toolIds = topToolsRaw.map((t) => t.toolId);
  const toolNames = await prisma.tool.findMany({
    where: { id: { in: toolIds } },
    select: { id: true, name: true },
  });
  const toolMap = Object.fromEntries(toolNames.map((t) => [t.id, t.name]));

  const topTools = topToolsRaw.map((t) => ({
    name: toolMap[t.toolId] ?? `ID ${t.toolId}`,
    count: t._count.id,
  }));

  const returnRate = totalLoans30d > 0 ? Math.round((returnedLoans30d / totalLoans30d) * 100) : 0;

  const kpis = [
    { label: "Préstamos activos", value: activeLoans, icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Con atraso", value: overdueLoans, icon: Clock, color: "text-red-600", bg: "bg-red-50" },
    { label: "Tasa de devolución (30d)", value: `${returnRate}%`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Alertas pendientes", value: pendingAlerts, icon: AlertTriangle, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Sanciones activas", value: sanctionCount, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Métricas</h1>
        <p className="text-muted-foreground text-sm">Estadísticas de uso del laboratorio.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="pt-5 pb-4">
                <div className={`inline-flex items-center justify-center rounded-lg p-2 ${k.bg} mb-3`}>
                  <Icon className={`size-5 ${k.color}`} />
                </div>
                <div className="text-2xl font-bold">{k.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top tools chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Herramientas más solicitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsChart data={topTools} />
          </CardContent>
        </Card>

        {/* Summary table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumen últimos 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2.5 text-muted-foreground">Total préstamos</td>
                  <td className="py-2.5 text-right font-semibold">{totalLoans30d}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2.5 text-muted-foreground">Devueltos</td>
                  <td className="py-2.5 text-right font-semibold text-emerald-600">{returnedLoans30d}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2.5 text-muted-foreground">Con atraso (activos)</td>
                  <td className="py-2.5 text-right font-semibold text-red-600">{overdueLoans}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2.5 text-muted-foreground">Sanciones activas</td>
                  <td className="py-2.5 text-right font-semibold text-purple-600">{sanctionCount}</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-muted-foreground">Tasa de devolución</td>
                  <td className="py-2.5 text-right font-semibold text-emerald-600">{returnRate}%</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
