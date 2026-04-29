import { ScrollText } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
          <CardTitle className="text-base">Buscar bitacora personal por carné</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action="/admin/audit"
            method="get"
            className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center"
          >
            <Input
              name="cardKey"
              defaultValue={params.cardKey ?? ""}
              placeholder="Ejemplo: KEY_123456"
              className="w-full md:max-w-sm min-w-0"
            />
            <Button type="submit" className="w-full sm:w-auto shrink-0">
              Buscar
            </Button>
            {params.cardKey ? (
              <Link
                href={`/admin/audit/${encodeURIComponent(params.cardKey.trim().toUpperCase())}`}
                className="text-sm text-foreground underline-offset-4 decoration-muted-foreground hover:underline"
              >
                Ir a bitacora de {params.cardKey.trim().toUpperCase()}
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

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
