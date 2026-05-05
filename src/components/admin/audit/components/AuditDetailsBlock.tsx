import { formatDateTime } from "@/lib/utils";

const DETAIL_LABELS: Record<string, string> = {
  loanId: "ID préstamo",
  deletedLoanId: "Préstamo eliminado",
  studentId: "ID estudiante",
  actorId: "ID actor / encargado",
  cardKey: "Carné",
  toolId: "Código herramienta",
  expectedReturnDate: "Devolución prevista",
  returnedAt: "Devuelto el",
  requiresApproval: "Requiere aprobación",
  reason: "Motivo",
  notes: "Notas",
  status: "Estado",
  isPermanent: "Permanente",
  endsAt: "Termina",
  startsAt: "Inicia",
  daysOverdue: "Días de atraso",
  sanctionType: "Tipo sanción",
  description: "Descripción",
  deletedSanctionId: "Sanción eliminada",
  entityType: "Tipo de entidad",
  entityId: "ID entidad",
};

const KEY_ORDER: string[] = [
  "reason",
  "description",
  "cardKey",
  "loanId",
  "deletedLoanId",
  "toolId",
  "studentId",
  "actorId",
  "status",
  "sanctionType",
  "requiresApproval",
  "isPermanent",
  "expectedReturnDate",
  "returnedAt",
  "startsAt",
  "endsAt",
  "daysOverdue",
  "notes",
  "entityType",
  "entityId",
  "deletedSanctionId",
];

function keyRank(k: string): number {
  const i = KEY_ORDER.indexOf(k);
  return i === -1 ? 1000 + k.charCodeAt(0) : i;
}

function humanizeKey(key: string): string {
  if (DETAIL_LABELS[key]) return DETAIL_LABELS[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatDetailValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Sí" : "No";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return formatDateTime(d);
    }
    return val;
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function tryParseJson(value: string | null): Record<string, unknown> | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

type AuditDetailsBlockProps = {
  details: string | null;
};

export default function AuditDetailsBlock({ details }: AuditDetailsBlockProps) {
  if (!details?.trim()) {
    return <span className="text-muted-foreground">—</span>;
  }

  const parsed = tryParseJson(details);
  if (!parsed) {
    return (
      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap wrap-break-word max-w-md">
        {details}
      </p>
    );
  }

  const entries = Object.entries(parsed).sort(([a], [b]) => keyRank(a) - keyRank(b));

  return (
    <div className="max-w-md space-y-2">
      <dl className="space-y-1.5">
        {entries.map(([key, val]) => (
          <div key={key} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[minmax(0,7.5rem)_1fr] sm:gap-x-3 text-xs">
            <dt className="font-medium text-muted-foreground shrink-0">{humanizeKey(key)}</dt>
            <dd className="text-foreground min-w-0 wrap-break-word leading-snug">{formatDetailValue(key, val)}</dd>
          </div>
        ))}
      </dl>
      <details className="group rounded-md border border-border bg-muted/30 dark:bg-muted/20 text-[11px]">
        <summary className="cursor-pointer select-none px-2 py-1.5 font-medium text-muted-foreground hover:text-foreground">
          JSON original
        </summary>
        <pre className="max-h-40 overflow-auto border-t border-border px-2 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </details>
    </div>
  );
}
