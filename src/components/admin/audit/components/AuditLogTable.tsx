import { formatDateTime } from "@/lib/utils";
import { ACTION_COLORS } from "../constants";
import { AuditLogRow } from "../types";

type AuditLogTableProps = {
  logs: AuditLogRow[];
};

export default function AuditLogTable({ logs }: AuditLogTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Fecha y hora</th>
            <th className="text-left py-2 pr-4 font-medium">Accion</th>
            <th className="text-left py-2 pr-4 font-medium">Actor</th>
            <th className="text-left py-2 pr-4 font-medium">Herramienta</th>
            <th className="text-left py-2 font-medium">Detalles</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                {formatDateTime(log.timestamp)}
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "text-muted-foreground bg-muted border-border"}`}
                >
                  {log.action}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground">
                {log.actor?.name ?? log.actor?.cardKey ?? "Sistema"}
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground">
                {log.tool ? `${log.tool.name} (${log.tool.toolId})` : "—"}
              </td>
              <td className="py-2.5 max-w-xs truncate text-xs text-muted-foreground">
                {log.details ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
