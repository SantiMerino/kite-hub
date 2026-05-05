import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageOpen,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";
import { DashboardStatItem } from "./types";

type DashboardTotals = {
  activeLoans: number;
  overdueLoans: number;
  pendingAlerts: number;
  totalTools: number;
  totalStudents: number;
  returnRate: number;
  sanctionCount: number;
};

export function buildDashboardStats(totals: DashboardTotals): DashboardStatItem[] {
  return [
    {
      label: "Préstamos activos",
      value: totals.activeLoans,
      icon: PackageOpen,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Con atraso",
      value: totals.overdueLoans,
      icon: Clock,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-500/10",
    },
    {
      label: "Alertas pendientes",
      value: totals.pendingAlerts,
      icon: AlertTriangle,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-500/10",
    },
    {
      label: "Tasa devolución (30d)",
      value: `${totals.returnRate}%`,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "Sanciones activas",
      value: totals.sanctionCount,
      icon: ShieldAlert,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-500/10",
    },
    {
      label: "Herramientas",
      value: totals.totalTools,
      icon: Wrench,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "Estudiantes",
      value: totals.totalStudents,
      icon: Users,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-500/10",
    },
  ];
}
