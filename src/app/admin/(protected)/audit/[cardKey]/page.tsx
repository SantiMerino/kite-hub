import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import AuditActionBadge from "@/components/admin/audit/components/AuditActionBadge";

type AuditByCardKeyPageProps = {
  params: Promise<{ cardKey: string }>;
};

function tryParseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default async function AuditByCardKeyPage({ params }: AuditByCardKeyPageProps) {
  const { cardKey } = await params;
  const normalizedCardKey = decodeURIComponent(cardKey).trim().toUpperCase();

  const student = await prisma.user.findUnique({
    where: { cardKey: normalizedCardKey },
    select: { id: true, cardKey: true, name: true, email: true },
  });

  if (!student) notFound();

  const [totalBorrowed, totalReturned, returnedLoansForLateCount, loans, logs] = await Promise.all([
    prisma.loan.count({ where: { studentId: student.id } }),
    prisma.loan.count({ where: { studentId: student.id, status: "returned" } }),
    prisma.loan.findMany({
      where: { studentId: student.id, status: "returned", actualReturnDate: { not: null } },
      select: { expectedReturnDate: true, actualReturnDate: true },
    }),
    prisma.loan.findMany({
      where: { studentId: student.id },
      include: { tool: true },
      orderBy: { borrowDate: "desc" },
      take: 30,
    }),
    prisma.auditLog.findMany({
      where: { userId: student.id },
      include: { tool: { select: { toolId: true, name: true } } },
      orderBy: { timestamp: "desc" },
      take: 50,
    }),
  ]);
  const lateReturns = returnedLoansForLateCount.filter(
    (loan) => loan.actualReturnDate && loan.actualReturnDate > loan.expectedReturnDate
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bitacora personal - {student.name ?? student.cardKey}
          </h1>
          <p className="text-muted-foreground text-sm">
            Registro parametrizado por carné: {student.cardKey}
          </p>
        </div>
        <Link href="/admin/audit" className="text-sm text-violet-700 hover:underline">
          Volver a bitacora general
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tools prestadas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalBorrowed}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tools devueltas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-700">{totalReturned}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Entregas tardias</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-red-700">{lateReturns}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de prestamos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Herramienta</th>
                  <th className="text-left py-2 pr-4 font-medium">Prestamo</th>
                  <th className="text-left py-2 pr-4 font-medium">Vence</th>
                  <th className="text-left py-2 pr-4 font-medium">Devuelto</th>
                  <th className="text-left py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2.5 pr-4">
                      {loan.tool.name} <span className="text-xs text-muted-foreground">({loan.tool.toolId})</span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{formatDateTime(loan.borrowDate)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{formatDateTime(loan.expectedReturnDate)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {loan.actualReturnDate ? formatDateTime(loan.actualReturnDate) : "—"}
                    </td>
                    <td className="py-2.5">
                      <Badge variant={loan.status === "returned" ? "returned" : "secondary"}>
                        {loan.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos de auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Fecha</th>
                  <th className="text-left py-2 pr-4 font-medium">Acción</th>
                  <th className="text-left py-2 pr-4 font-medium">Herramienta</th>
                  <th className="text-left py-2 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const details = tryParseJson(log.details);
                  return (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-4 text-muted-foreground">{formatDateTime(log.timestamp)}</td>
                      <td className="py-2.5 pr-4 align-top">
                        <AuditActionBadge action={log.action} />
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {log.tool ? `${log.tool.name} (${log.tool.toolId})` : "—"}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {details?.reason
                          ? String(details.reason)
                          : log.details ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
