export type SanctionRow = {
  id: number;
  studentId: number;
  student: { id: number; name: string | null; cardKey: string | null };
  loan: { tool: { name: string; toolId: string } } | null;
  sanctionType: string;
  daysOverdue: number;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  isPermanent: boolean;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
};
