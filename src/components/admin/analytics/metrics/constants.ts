import { AlertTriangle, BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { MetricsKpiItem } from "./types";

type KpiTotals = {
  activeLoans: number;
  overdueLoans: number;
  returnRate: number;
  pendingAlerts: number;
  sanctionCount: number;
};

export function buildMetricsKpis(totals: KpiTotals): MetricsKpiItem[] {
  return [
    { label: "Prestamos activos", value: totals.activeLoans, icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Con atraso", value: totals.overdueLoans, icon: Clock, color: "text-red-600", bg: "bg-red-50" },
    { label: "Tasa de devolucion (30d)", value: `${totals.returnRate}%`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Alertas pendientes", value: totals.pendingAlerts, icon: AlertTriangle, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Sanciones activas", value: totals.sanctionCount, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
  ];
}
