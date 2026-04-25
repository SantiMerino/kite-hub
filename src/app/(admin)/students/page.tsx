import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const students = await prisma.user.findMany({
    where: { role: "student" },
    include: {
      loans: {
        where: { status: { in: ["active", "overdue"] } },
        select: { id: true, status: true },
      },
      sanctions: {
        where: { status: "active" },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estudiantes</h1>
        <p className="text-muted-foreground text-sm">
          Directorio de estudiantes registrados en el sistema.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-blue-600" />
            Todos los estudiantes
            <Badge variant="loan">{students.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Nombre</th>
                  <th className="text-left py-2 pr-4 font-medium">Carné (KEY)</th>
                  <th className="text-left py-2 pr-4 font-medium">Correo</th>
                  <th className="text-left py-2 pr-4 font-medium">Registrado</th>
                  <th className="text-left py-2 pr-4 font-medium">Préstamos</th>
                  <th className="text-left py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const overdueCount = student.loans.filter((l) => l.status === "overdue").length;
                  return (
                    <tr key={student.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-4 font-medium">
                        {student.isBanned && (
                          <ShieldAlert className="inline size-3.5 mr-1 text-red-500" />
                        )}
                        {student.name ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {student.cardKey ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                        {student.email ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                        {formatDate(student.createdAt)}
                      </td>
                      <td className="py-2.5 pr-4">
                        {student.loans.length > 0 ? (
                          <span className={overdueCount > 0 ? "text-red-600 font-semibold" : ""}>
                            {student.loans.length} activo(s){overdueCount > 0 && ` · ${overdueCount} vencido(s)`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {student.isBanned ? (
                          <Badge variant="overdue">Bloqueado</Badge>
                        ) : student.sanctions.length > 0 ? (
                          <Badge variant="alert">Con sanción</Badge>
                        ) : (
                          <Badge variant="returned">Activo</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {students.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No hay estudiantes registrados.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
