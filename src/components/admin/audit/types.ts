export type AuditPageParams = {
  page?: string;
  cardKey?: string;
};

export type AuditLogRow = {
  id: number;
  action: string;
  details: string | null;
  timestamp: Date;
  actor: { id: number; name: string | null; cardKey: string | null } | null;
  tool: { id: number; toolId: string; name: string } | null;
};
