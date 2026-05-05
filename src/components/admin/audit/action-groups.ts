import type { Prisma } from "@prisma/client";

/** Query param value for `group` — sync with `AuditActionGroupSelect`. */
export type AuditActionGroupId = "all" | "loans" | "returns" | "tools" | "sanctions" | "accounts";

export const AUDIT_ACTION_GROUP_LABEL: Record<AuditActionGroupId, string> = {
  all: "Todas las acciones",
  loans: "Préstamos y solicitudes",
  returns: "Devoluciones",
  tools: "Herramientas (altas, ediciones, bajas)",
  sanctions: "Sanciones",
  accounts: "Cuentas (bloqueo / desbloqueo)",
};

/** Prisma filter: which `action` strings belong to each group. */
export const AUDIT_ACTION_GROUP_ACTIONS: Record<Exclude<AuditActionGroupId, "all">, readonly string[]> = {
  loans: [
    "BORROW",
    "LOAN_REQUESTED",
    "LOAN_APPROVED",
    "LOAN_DENIED",
    "LOAN_CANCELLED",
    "DELETE_LOAN",
  ],
  returns: ["RETURN", "ADMIN_RETURN"],
  tools: ["CREATE_TOOL", "UPDATE_TOOL", "DELETE_TOOL"],
  sanctions: ["CREATE_SANCTION", "UPDATE_SANCTION", "DELETE_SANCTION"],
  accounts: ["BAN_STUDENT", "UNBAN_STUDENT"],
};

export function parseAuditActionGroup(value: string | undefined): AuditActionGroupId {
  const v = (value ?? "all").toLowerCase();
  if (v === "loans") return "loans";
  if (v === "returns") return "returns";
  if (v === "tools") return "tools";
  if (v === "sanctions") return "sanctions";
  if (v === "accounts") return "accounts";
  return "all";
}

export function auditTimestampWhere(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  const timestamp: Prisma.DateTimeFilter = {};
  if (from?.trim()) {
    const d = new Date(`${from.trim()}T00:00:00`);
    if (!Number.isNaN(d.getTime())) timestamp.gte = d;
  }
  if (to?.trim()) {
    const d = new Date(`${to.trim()}T23:59:59.999`);
    if (!Number.isNaN(d.getTime())) timestamp.lte = d;
  }
  return timestamp.gte || timestamp.lte ? timestamp : undefined;
}

export function buildAuditLogWhere(params: {
  group: AuditActionGroupId;
  from?: string;
  to?: string;
}): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (params.group !== "all") {
    where.action = { in: [...AUDIT_ACTION_GROUP_ACTIONS[params.group]] };
  }
  const ts = auditTimestampWhere(params.from, params.to);
  if (ts) where.timestamp = ts;
  return where;
}
