import { ReactNode } from "react";

export type LoanRow = {
  id: number;
  tool: { name: string; toolId: string };
  student: { id: number; name: string | null; cardKey: string | null; email?: string | null };
  borrowDate: Date;
  expectedReturnDate: Date;
  actualReturnDate?: Date | null;
  status: string;
  notes?: string | null;
};

export type LoanPayload = {
  active: LoanRow[];
  requested: LoanRow[];
  overdue: LoanRow[];
  recent: LoanRow[];
  deniedOrCancelled: LoanRow[];
};

export type LoanTableActions = (loan: LoanRow) => ReactNode;
