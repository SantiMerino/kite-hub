import {
  AlertTriangle,
  Clock,
  PackageOpen,
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
};

export function buildDashboardStats(totals: DashboardTotals): DashboardStatItem[] {
  return [
    {
      label: "Prestamos activos",
      value: totals.activeLoans,
      icon: PackageOpen,
      color: "text-blue-600 dark:text-foreground",
      bg: "bg-blue-50 dark:bg-muted",
    },
    {
      label: "Con atraso",
      value: totals.overdueLoans,
      icon: Clock,
      color: "text-red-600 dark:text-red-300",
      bg: "bg-red-50 dark:bg-red-950/30",
    },
    {
      label: "Alertas pendientes",
      value: totals.pendingAlerts,
      icon: AlertTriangle,
      color: "text-purple-600 dark:text-purple-300",
      bg: "bg-purple-50 dark:bg-muted",
    },
    {
      label: "Herramientas",
      value: totals.totalTools,
      icon: Wrench,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-muted",
    },
    {
      label: "Estudiantes",
      value: totals.totalStudents,
      icon: Users,
      color: "text-violet-600 dark:text-violet-300",
      bg: "bg-violet-50 dark:bg-muted",
    },
  ];
}
