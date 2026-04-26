export type StudentRow = {
  id: number;
  name: string | null;
  cardKey: string | null;
  email: string | null;
  isBanned: boolean;
  createdAt: string;
  loans: { id: number; status: string }[];
  sanctions: { id: number }[];
};

export type StatusFilter = "all" | "active" | "sanctioned" | "banned" | "has_loans" | "overdue";
