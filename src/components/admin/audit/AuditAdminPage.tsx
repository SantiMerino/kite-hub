import { ScrollText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AUDIT_PAGE_SIZE } from "./constants";
import { AuditPageParams } from "./types";
import AuditLogTable from "./components/AuditLogTable";
import AuditPagination from "./components/AuditPagination";

type AuditAdminPageProps = {
  searchParams: Promise<AuditPageParams>;
};

export default async function AuditAdminPage({ searchParams }: AuditAdminPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = AUDIT_PAGE_SIZE;

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
        <h1 className="text-2xl font-bold tracking-tight">Bitacora de auditoria</h1>
        <p className="text-muted-foreground text-sm">
          Registro completo de acciones en el sistema ({total.toLocaleString()} entradas).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="size-4 text-violet-600" />
            Eventos recientes — Pagina {page} de {totalPages}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogTable logs={logs} />
          <AuditPagination page={page} limit={limit} total={total} totalPages={totalPages} />
        </CardContent>
      </Card>
    </div>
  );
}
