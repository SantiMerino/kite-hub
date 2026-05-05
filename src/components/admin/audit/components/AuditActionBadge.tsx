import { cn } from "@/lib/utils";
import { ACTION_COLORS } from "../constants";
import { getAuditActionIcon, getAuditActionLabel } from "../audit-action-meta";

type AuditActionBadgeProps = {
  action: string;
  className?: string;
};

export default function AuditActionBadge({ action, className }: AuditActionBadgeProps) {
  const Icon = getAuditActionIcon(action);
  const label = getAuditActionLabel(action);
  const colors =
    ACTION_COLORS[action] ?? "text-muted-foreground bg-muted border-border";

  return (
    <span
      className={cn(
        "inline-flex max-w-[11rem] items-start gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium sm:max-w-[13rem]",
        colors,
        className,
      )}
      title={action}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0 opacity-90" aria-hidden />
      <span className="min-w-0 text-left leading-snug break-words">{label}</span>
    </span>
  );
}
