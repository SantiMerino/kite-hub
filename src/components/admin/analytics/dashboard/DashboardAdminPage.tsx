import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { withDevDatabaseFallback } from "@/lib/dev-bypass";
import { buildDashboardStats } from "./constants";
import DashboardStatsGrid from "./components/DashboardStatsGrid";
import RecentLoansTable from "./components/RecentLoansTable";
import DashboardMetricsSection from "./components/DashboardMetricsSection";
import type { AdminMetricsBundle } from "@/components/admin/analytics/metrics/load-admin-metrics";
import { DashboardLoanRow } from "./types";

const EMPTY_METRICS: AdminMetricsBundle = {
  kpis: [],
  topTools: [],
  summary: {
    totalLoans30d: 0,
    returnedLoans30d: 0,
    overdueLoans: 0,
    sanctionCount: 0,
    returnRate: 0,
  },
};

async function DashboardContent() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    activeLoans,
    overdueLoans,
    pendingAlerts,
    totalTools,
    totalStudents,
    sanctionCount,
    totalLoans30d,
    returnedLoans30d,
    topToolsRaw,
    recentLoans,
  ] = await withDevDatabaseFallback(
    () =>
      Promise.all([
        prisma.loan.count({ where: { status: "active" } }),
        prisma.loan.count({ where: { status: "overdue" } }),
        prisma.alert.count({ where: { status: "pending" } }),
        prisma.tool.count(),
        prisma.user.count({ where: { role: "student" } }),
        prisma.sanction.count({ where: { status: "active" } }),
        prisma.loan.count({ where: { borrowDate: { gte: thirtyDaysAgo } } }),
        prisma.loan.count({
          where: { status: "returned", borrowDate: { gte: thirtyDaysAgo } },
        }),
        prisma.loan.groupBy({
          by: ["toolId"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 5,
        }),
        prisma.loan.findMany({
          where: { status: { in: ["active", "overdue"] } },
          include: {
            tool: true,
            student: { select: { id: true, name: true, cardKey: true } },
          },
          orderBy: { expectedReturnDate: "asc" },
          take: 8,
        }),
      ]),
    [0, 0, 0, 0, 0, 0, 0, 0, [], []] as const,
  );

  const returnRate =
    totalLoans30d > 0 ? Math.round((returnedLoans30d / totalLoans30d) * 100) : 0;

  // Hydrate top tools names
  let topTools: { name: string; count: number }[] = [];
  if (topToolsRaw.length > 0) {
    const toolIds = topToolsRaw.map((t) => t.toolId);
    const toolNames = await withDevDatabaseFallback(
      () =>
        prisma.tool.findMany({
          where: { id: { in: toolIds } },
          select: { id: true, name: true },
        }),
      [],
    );
    const toolMap = Object.fromEntries(toolNames.map((t) => [t.id, t.name]));
    topTools = topToolsRaw.map((t) => ({
      name: toolMap[t.toolId] ?? `ID ${t.toolId}`,
      count: t._count.id,
    }));
  }

  const stats = buildDashboardStats({
    activeLoans,
    overdueLoans,
    pendingAlerts,
    totalTools,
    totalStudents,
    returnRate,
    sanctionCount,
  });

  const metrics: AdminMetricsBundle = {
    kpis: [],
    topTools,
    summary: {
      totalLoans30d,
      returnedLoans30d,
      overdueLoans,
      sanctionCount,
      returnRate,
    },
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de control</h1>
        <p className="text-muted-foreground text-sm">Resumen del laboratorio en tiempo real.</p>
      </div>

      <DashboardStatsGrid stats={stats} />
      <RecentLoansTable loans={recentLoans as DashboardLoanRow[]} />
      <DashboardMetricsSection metrics={metrics} />
    </div>
  );
}

export default function DashboardAdminPage() {
  return (
    <Suspense fallback={<div className="skeleton h-8 w-48 mb-4" />}>
      <DashboardContent />
    </Suspense>
  );
}
