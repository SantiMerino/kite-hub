import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { withDevDatabaseFallback } from "@/lib/dev-bypass";
import { buildDashboardStats } from "./constants";
import DashboardStatsGrid from "./components/DashboardStatsGrid";
import RecentLoansTable from "./components/RecentLoansTable";
import { DashboardLoanRow } from "./types";

async function DashboardContent() {
  const [activeLoans, overdueLoans, pendingAlerts, totalTools, totalStudents, recentLoans] =
    await withDevDatabaseFallback(
      () =>
        Promise.all([
          prisma.loan.count({ where: { status: "active" } }),
          prisma.loan.count({ where: { status: "overdue" } }),
          prisma.alert.count({ where: { status: "pending" } }),
          prisma.tool.count(),
          prisma.user.count({ where: { role: "student" } }),
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
      [0, 0, 0, 0, 0, []] as const,
    );

  const stats = buildDashboardStats({
    activeLoans,
    overdueLoans,
    pendingAlerts,
    totalTools,
    totalStudents,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de control</h1>
        <p className="text-muted-foreground text-sm">Resumen del laboratorio en tiempo real.</p>
      </div>

      <DashboardStatsGrid stats={stats} />
      <RecentLoansTable loans={recentLoans as DashboardLoanRow[]} />
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
