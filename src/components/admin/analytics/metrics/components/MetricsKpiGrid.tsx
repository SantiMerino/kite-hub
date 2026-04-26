import { Card, CardContent } from "@/components/ui/card";
import { MetricsKpiItem } from "../types";

type MetricsKpiGridProps = {
  kpis: MetricsKpiItem[];
};

export default function MetricsKpiGrid({ kpis }: MetricsKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label}>
            <CardContent className="pt-5 pb-4">
              <div className={`inline-flex items-center justify-center rounded-lg p-2 ${kpi.bg} mb-3`}>
                <Icon className={`size-5 ${kpi.color}`} />
              </div>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
