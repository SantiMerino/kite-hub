export type AuditPageParams = {
  page?: string;
  cardKey?: string;
  /** Filtro por categoría de acción (`action-groups`). */
  group?: string;
  /** Fecha inicio (YYYY-MM-DD). */
  from?: string;
  /** Fecha fin (YYYY-MM-DD). */
  to?: string;
};

export type AuditLogRow = {
  id: number;
  action: string;
  details: string | null;
  timestamp: Date;
  actor: { id: number; name: string | null; cardKey: string | null } | null;
  tool: { id: number; toolId: string; name: string } | null;
};
