import { ScrollText } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseAuditActionGroup, buildAuditLogWhere } from "./action-groups";
import { AUDIT_PAGE_SIZE } from "./constants";
import { AuditPageParams } from "./types";
import AuditActionGroupSelect from "./components/AuditActionGroupSelect";
import AuditLogTable from "./components/AuditLogTable";
import AuditPagination from "./components/AuditPagination";

type AuditAdminPageProps = {
  searchParams: Promise<AuditPageParams>;
};

export default async function AuditAdminPage({ searchParams }: AuditAdminPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = AUDIT_PAGE_SIZE;
  const group = parseAuditActionGroup(params.group);
  const dateFrom = params.from?.trim() ?? "";
  const dateTo = params.to?.trim() ?? "";
  const where = buildAuditLogWhere({ group, from: dateFrom || undefined, to: dateTo || undefined });

  const [logs, total, totalUnfiltered] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, cardKey: true } },
        tool: { select: { id: true, toolId: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginationQuery = {
    cardKey: params.cardKey?.trim() || undefined,
    group,
    from: dateFrom || undefined,
    to: dateTo || undefined,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bitacora de auditoria</h1>
        <p className="text-muted-foreground text-sm">
          Registro de acciones en el sistema ({totalUnfiltered.toLocaleString()} entradas
          {group !== "all" || dateFrom || dateTo ? (
            <>
              ; mostrando <span className="font-medium text-foreground">{total.toLocaleString()}</span> con filtros
            </>
          ) : null}
          ).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/admin/audit" method="get" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="audit-group">Tipo de acción</Label>
                <AuditActionGroupSelect key={`${group}-${dateFrom}-${dateTo}`} name="group" defaultValue={group} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="audit-from">Desde</Label>
                <Input
                  id="audit-from"
                  name="from"
                  type="date"
                  defaultValue={dateFrom}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="audit-to">Hasta</Label>
                <Input
                  id="audit-to"
                  name="to"
                  type="date"
                  defaultValue={dateTo}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-1.5 w-full sm:max-w-sm">
                <Label htmlFor="audit-card">Bitácora por carné (opcional)</Label>
                <Input
                  id="audit-card"
                  name="cardKey"
                  defaultValue={params.cardKey ?? ""}
                  placeholder="Ejemplo: KEY_123456"
                  className="min-w-0 font-mono text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="w-full sm:w-auto">
                  Aplicar filtros
                </Button>
                <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/admin/audit">Limpiar</Link>
                </Button>
              </div>
            </div>
            {params.cardKey?.trim() ? (
              <p className="text-sm">
                <Link
                  href={`/admin/audit/${encodeURIComponent(params.cardKey.trim().toUpperCase())}`}
                  className="text-violet-700 underline-offset-4 decoration-muted-foreground hover:underline dark:text-violet-300"
                >
                  Ir a bitácora personal de {params.cardKey.trim().toUpperCase()}
                </Link>
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="size-4 text-violet-600 dark:text-violet-400" />
            Eventos recientes — Página {page} de {totalPages}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogTable logs={logs} />
          <AuditPagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            query={paginationQuery}
          />
        </CardContent>
      </Card>
    </div>
  );
}
