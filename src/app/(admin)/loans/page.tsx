import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, daysOverdue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  const [activeLoans, overdueLoans, returnedLoans] = await Promise.all([
    prisma.loan.findMany({
      where: { status: "active" },
      include: {
        tool: true,
        student: { select: { id: true, name: true, cardKey: true } },
      },
      orderBy: { expectedReturnDate: "asc" },
    }),
    prisma.loan.findMany({
      where: { status: "overdue" },
      include: {
        tool: true,
        student: { select: { id: true, name: true, cardKey: true } },
      },
      orderBy: { expectedReturnDate: "asc" },
    }),
    prisma.loan.findMany({
      where: { status: "returned" },
      include: {
        tool: true,
        student: { select: { id: true, name: true, cardKey: true } },
      },
      orderBy: { actualReturnDate: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Préstamos</h1>
        <p className="text-muted-foreground text-sm">Gestión de préstamos activos, vencidos y devueltos.</p>
      </div>

      {overdueLoans.length > 0 && (
        <Card className="border-red-200 bg-red-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700">
              Vencidos ({overdueLoans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LoanTable loans={overdueLoans} showOverdue />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activos ({activeLoans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanTable loans={activeLoans} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-muted-foreground">
            Últimas devoluciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoanTable loans={returnedLoans} returned />
        </CardContent>
      </Card>
    </div>
  );
}

type LoanRow = {
  id: number;
  tool: { name: string; toolId: string };
  student: { id: number; name: string | null; cardKey: string | null };
  borrowDate: Date;
  expectedReturnDate: Date;
  actualReturnDate?: Date | null;
  status: string;
};

function LoanTable({
  loans,
  showOverdue = false,
  returned = false,
}: {
  loans: LoanRow[];
  showOverdue?: boolean;
  returned?: boolean;
}) {
  if (loans.length === 0) {
    return <p className="text-sm text-muted-foreground py-3">Sin registros.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Estudiante</th>
            <th className="text-left py-2 pr-4 font-medium">Herramienta</th>
            <th className="text-left py-2 pr-4 font-medium">Préstamo</th>
            <th className="text-left py-2 pr-4 font-medium">
              {returned ? "Devuelto" : "Vence"}
            </th>
            {showOverdue && (
              <th className="text-left py-2 font-medium">Días atraso</th>
            )}
            <th className="text-left py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-2.5 pr-4 font-medium">
                {loan.student.name ?? loan.student.cardKey}
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground">
                <span>{loan.tool.name}</span>
                <br />
                <span className="text-xs font-mono">{loan.tool.toolId}</span>
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground">
                {formatDate(loan.borrowDate)}
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground">
                {returned
                  ? formatDate(loan.actualReturnDate)
                  : formatDate(loan.expectedReturnDate)}
              </td>
              {showOverdue && (
                <td className="py-2.5 pr-4 font-semibold text-red-600">
                  {daysOverdue(loan.expectedReturnDate)}d
                </td>
              )}
              <td className="py-2.5">
                {loan.status === "overdue" && <Badge variant="overdue">Vencido</Badge>}
                {loan.status === "active" && <Badge variant="loan">Activo</Badge>}
                {loan.status === "returned" && <Badge variant="returned">Devuelto</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
