import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { DashboardLoanRow } from "../types";

type RecentLoansTableProps = {
  loans: DashboardLoanRow[];
};

export default function RecentLoansTable({ loans }: RecentLoansTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-1 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Prestamos activos y vencidos</CardTitle>
        <Link
          href="/admin/loans"
          className="text-xs text-foreground underline-offset-4 decoration-muted-foreground hover:underline"
        >
          Ver todos
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-4 font-medium">Estudiante</th>
                <th className="text-left py-2 pr-4 font-medium">Herramienta</th>
                <th className="text-left py-2 pr-4 font-medium">Vence</th>
                <th className="text-left py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-b last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{loan.student.name ?? loan.student.cardKey}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{loan.tool.name}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{formatDate(loan.expectedReturnDate)}</td>
                  <td className="py-2.5">
                    {loan.status === "overdue" ? (
                      <Badge variant="overdue">Vencido</Badge>
                    ) : (
                      <Badge variant="loan">Activo</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    <CheckCircle2 className="size-5 inline mr-2 text-emerald-500" />
                    No hay prestamos activos ni vencidos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
