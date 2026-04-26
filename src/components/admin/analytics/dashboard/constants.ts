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
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Con atraso",
      value: totals.overdueLoans,
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Alertas pendientes",
      value: totals.pendingAlerts,
      icon: AlertTriangle,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Herramientas",
      value: totals.totalTools,
      icon: Wrench,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Estudiantes",
      value: totals.totalStudents,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];
}
