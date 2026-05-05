import type { AuditActionGroupId } from "./action-groups";

export type AuditListQuery = {
  page?: number;
  cardKey?: string;
  group?: AuditActionGroupId;
  from?: string;
  to?: string;
};

/** Build `/admin/audit` URL with stable query string (omits defaults). */
export function buildAuditListHref(q: AuditListQuery): string {
  const params = new URLSearchParams();
  const card = q.cardKey?.trim();
  if (card) params.set("cardKey", card);
  if (q.group && q.group !== "all") params.set("group", q.group);
  const from = q.from?.trim();
  const to = q.to?.trim();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (q.page && q.page > 1) params.set("page", String(q.page));
  const s = params.toString();
  return s ? `/admin/audit?${s}` : "/admin/audit";
}
