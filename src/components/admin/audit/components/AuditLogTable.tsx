import { formatDateTime } from "@/lib/utils";
import { AuditLogRow } from "../types";
import AuditActionBadge from "./AuditActionBadge";
import AuditDetailsBlock from "./AuditDetailsBlock";

type AuditLogTableProps = {
  logs: AuditLogRow[];
};

export default function AuditLogTable({ logs }: AuditLogTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium align-bottom">Fecha y hora</th>
            <th className="text-left py-2 pr-4 font-medium align-bottom w-[1%] min-w-30">Acción</th>
            <th className="text-left py-2 pr-4 font-medium align-bottom">Actor</th>
            <th className="text-left py-2 pr-4 font-medium align-bottom">Herramienta</th>
            <th className="text-left py-2 font-medium align-bottom">Detalles</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap align-top">
                {formatDateTime(log.timestamp)}
              </td>
              <td className="py-2.5 pr-4 align-top">
                <AuditActionBadge action={log.action} />
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground align-top">
                {log.actor?.name ?? log.actor?.cardKey ?? "Sistema"}
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground align-top">
                {log.tool ? `${log.tool.name} (${log.tool.toolId})` : "—"}
              </td>
              <td className="py-2.5 align-top min-w-48 max-w-md">
                <AuditDetailsBlock details={log.details} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
