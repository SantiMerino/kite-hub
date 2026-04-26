import { LucideIcon } from "lucide-react";

export type DashboardLoanRow = {
  id: number;
  status: "active" | "overdue";
  expectedReturnDate: Date;
  tool: { name: string };
  student: { id: number; name: string | null; cardKey: string | null };
};

export type DashboardStatItem = {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
};
