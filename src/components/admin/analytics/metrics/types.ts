import { LucideIcon } from "lucide-react";

export type TopToolMetric = {
  name: string;
  count: number;
};

export type MetricsKpiItem = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bg: string;
};
