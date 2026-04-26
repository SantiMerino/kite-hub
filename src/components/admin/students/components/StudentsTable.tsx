import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { StudentRow } from "../types";

type StudentsTableProps = {
  loading: boolean;
  students: StudentRow[];
};

export default function StudentsTable({ loading, students }: StudentsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Nombre</th>
            <th className="text-left py-2 pr-4 font-medium">Carne (KEY)</th>
            <th className="text-left py-2 pr-4 font-medium">Correo</th>
            <th className="text-left py-2 pr-4 font-medium">Registrado</th>
            <th className="text-left py-2 pr-4 font-medium">Prestamos</th>
            <th className="text-left py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="py-10 text-center text-muted-foreground">Cargando…</td>
            </tr>
          ) : (
            students.map((student) => {
              const overdueCount = student.loans.filter((loan) => loan.status === "overdue").length;
              return (
                <tr key={student.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-2.5 pr-4 font-medium">
                    {student.isBanned && <ShieldAlert className="inline size-3.5 mr-1 text-red-600" />}
                    {student.name ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{student.cardKey ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground text-xs">{student.email ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground text-xs">{formatDate(new Date(student.createdAt))}</td>
                  <td className="py-2.5 pr-4">
                    {student.loans.length > 0 ? (
                      <span className={overdueCount > 0 ? "text-red-600 font-semibold" : ""}>
                        {student.loans.length} activo(s)
                        {overdueCount > 0 && ` · ${overdueCount} vencido(s)`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {student.isBanned ? (
                      <Badge variant="overdue">Bloqueado</Badge>
                    ) : student.sanctions.length > 0 ? (
                      <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold tracking-wide text-red-600">
                        BANNED
                      </span>
                    ) : (
                      <Badge variant="returned">Activo</Badge>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
