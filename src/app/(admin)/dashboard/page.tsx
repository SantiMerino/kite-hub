import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { withDevDatabaseFallback } from "@/lib/dev-bypass";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PackageOpen,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wrench,
  Users,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

async function DashboardStats() {
  const now = new Date();

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

  void now;

  const stats = [
    {
      label: "Préstamos activos",
      value: activeLoans,
      icon: PackageOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Con atraso",
      value: overdueLoans,
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Alertas pendientes",
      value: pendingAlerts,
      icon: AlertTriangle,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Herramientas",
      value: totalTools,
      icon: Wrench,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Estudiantes",
      value: totalStudents,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de control</h1>
        <p className="text-muted-foreground text-sm">Resumen del laboratorio en tiempo real.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="pt-5 pb-4">
                <div className={`inline-flex items-center justify-center rounded-lg p-2 ${s.bg} mb-3`}>
                  <Icon className={`size-5 ${s.color}`} />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active / overdue loans table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Préstamos activos y vencidos</CardTitle>
            <Link href="/admin/loans" className="text-xs text-blue-600 hover:underline">
            Ver todos
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Estudiante</th>
                  <th className="text-left py-2 pr-4 font-medium">Herramienta</th>
                  <th className="text-left py-2 pr-4 font-medium">Vence</th>
                  <th className="text-left py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentLoans.map((loan) => (
                  <tr key={loan.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">
                      <span className="font-medium">{loan.student.name ?? loan.student.cardKey}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{loan.tool.name}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{formatDate(loan.expectedReturnDate)}</td>
                    <td className="py-2.5">
                      {loan.status === "overdue" ? (
                        <Badge variant="overdue">Vencido</Badge>
                      ) : (
                        <Badge variant="loan">Activo</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {recentLoans.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      <CheckCircle2 className="size-5 inline mr-2 text-emerald-500" />
                      No hay préstamos activos ni vencidos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="skeleton h-8 w-48 mb-4" />}>
      <DashboardStats />
    </Suspense>
  );
}
