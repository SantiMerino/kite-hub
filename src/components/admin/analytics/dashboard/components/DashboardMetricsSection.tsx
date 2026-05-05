import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsChart } from "@/components/charts/MetricsChart";
import MetricsSummaryTable from "@/components/admin/analytics/metrics/components/MetricsSummaryTable";
import type { AdminMetricsBundle } from "@/components/admin/analytics/metrics/load-admin-metrics";

type DashboardMetricsSectionProps = {
  metrics: AdminMetricsBundle;
};

export default function DashboardMetricsSection({ metrics }: DashboardMetricsSectionProps) {
  const { topTools, summary } = metrics;

  return (
    <section id="metricas" className="scroll-mt-6 space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Tendencias (30 días)</h2>
        <p className="text-sm text-muted-foreground">
          Herramientas más solicitadas y resumen del período.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Herramientas más solicitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsChart data={topTools} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumen últimos 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsSummaryTable
              totalLoans30d={summary.totalLoans30d}
              returnedLoans30d={summary.returnedLoans30d}
              overdueLoans={summary.overdueLoans}
              sanctionCount={summary.sanctionCount}
              returnRate={summary.returnRate}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
