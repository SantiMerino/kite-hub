import { Badge } from "@/components/ui/badge";
import { daysOverdue, formatDate } from "@/lib/utils";
import { LoanRow, LoanTableActions } from "../types";
import Link from "next/link";

type LoansTableProps = {
  loans: LoanRow[];
  showOverdue?: boolean;
  returned?: boolean;
  actions?: LoanTableActions;
};

export default function LoansTable({ loans, showOverdue = false, returned = false, actions }: LoansTableProps) {
  if (loans.length === 0) return <p className="text-sm text-muted-foreground py-3">Sin registros.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Estudiante</th>
            <th className="text-left py-2 pr-4 font-medium">Herramienta</th>
            <th className="text-left py-2 pr-4 font-medium">Prestamo</th>
            <th className="text-left py-2 pr-4 font-medium">{returned ? "Devuelto" : "Vence"}</th>
            {showOverdue && <th className="text-left py-2 font-medium">Dias atraso</th>}
            <th className="text-left py-2 font-medium">Estado</th>
            {actions && <th className="text-left py-2 font-medium">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-2.5 pr-4 font-medium">
                {loan.student.cardKey ? (
                  <Link
                    href={`/admin/audit/${encodeURIComponent(loan.student.cardKey)}`}
                    className="text-blue-700 hover:underline"
                  >
                    {loan.student.name ?? loan.student.cardKey}
                  </Link>
                ) : (
                  (loan.student.name ?? "Sin carné")
                )}
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground"><span>{loan.tool.name}</span><br /><span className="text-xs font-mono">{loan.tool.toolId}</span></td>
              <td className="py-2.5 pr-4 text-muted-foreground">{formatDate(loan.borrowDate)}</td>
              <td className="py-2.5 pr-4 text-muted-foreground">{returned ? formatDate(loan.actualReturnDate) : formatDate(loan.expectedReturnDate)}</td>
              {showOverdue && <td className="py-2.5 pr-4 font-semibold text-red-600">{daysOverdue(loan.expectedReturnDate)}d</td>}
              <td className="py-2.5">
                {loan.status === "overdue" && <Badge variant="overdue">Vencido</Badge>}
                {loan.status === "active" && <Badge variant="loan">Activo</Badge>}
                {loan.status === "approved" && <Badge variant="admin">Aprobado</Badge>}
                {loan.status === "requested" && <Badge variant="alert">Pendiente</Badge>}
                {loan.status === "returned" && <Badge variant="returned">Devuelto</Badge>}
                {loan.status === "denied" && <Badge variant="destructive">Denegado</Badge>}
                {loan.status === "cancelled" && <Badge variant="secondary">Cancelado</Badge>}
              </td>
              {actions && <td className="py-2.5">{actions(loan)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
