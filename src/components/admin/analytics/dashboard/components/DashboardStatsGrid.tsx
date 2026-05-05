import { Card, CardContent } from "@/components/ui/card";
import { DashboardStatItem } from "../types";

type DashboardStatsGridProps = {
  stats: DashboardStatItem[];
};

export default function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className={`inline-flex items-center justify-center rounded-md p-2 ${stat.bg} mb-2.5`}>
                <Icon className={`size-4 ${stat.color}`} />
              </div>
              <div className="text-xl font-bold leading-none">{stat.value}</div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
