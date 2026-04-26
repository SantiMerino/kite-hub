import { Card, CardContent } from "@/components/ui/card";
import { DashboardStatItem } from "../types";

type DashboardStatsGridProps = {
  stats: DashboardStatItem[];
};

export default function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="pt-5 pb-4">
              <div className={`inline-flex items-center justify-center rounded-lg p-2 ${stat.bg} mb-3`}>
                <Icon className={`size-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
