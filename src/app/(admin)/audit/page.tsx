import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ACTION_COLORS: Record<string, string> = {
  BORROW: "text-blue-600 bg-blue-50 border-blue-200",
  RETURN: "text-emerald-600 bg-emerald-50 border-emerald-200",
  ADMIN_RETURN: "text-violet-600 bg-violet-50 border-violet-200",
  CREATE_TOOL: "text-emerald-600 bg-emerald-50 border-emerald-200",
  UPDATE_TOOL: "text-amber-600 bg-amber-50 border-amber-200",
  DELETE_TOOL: "text-red-600 bg-red-50 border-red-200",
  CREATE_SANCTION: "text-purple-600 bg-purple-50 border-purple-200",
  BAN_STUDENT: "text-red-600 bg-red-50 border-red-200",
  UNBAN_STUDENT: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: {
        actor: { select: { id: true, name: true, cardKey: true } },
        tool: { select: { id: true, toolId: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bitácora de auditoría</h1>
        <p className="text-muted-foreground text-sm">
          Registro completo de acciones en el sistema ({total.toLocaleString()} entradas).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="size-4 text-violet-600" />
            Eventos recientes — Página {page} de {totalPages}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Fecha y hora</th>
                  <th className="text-left py-2 pr-4 font-medium">Acción</th>
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

          {/* Pagination */}
          <div className="flex justify-between items-center pt-4 text-sm">
            <span className="text-muted-foreground">
              Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`?page=${page - 1}`}
                  className="px-3 py-1.5 rounded-md border hover:bg-muted text-sm"
                >
                  Anterior
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`?page=${page + 1}`}
                  className="px-3 py-1.5 rounded-md border hover:bg-muted text-sm"
                >
                  Siguiente
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
