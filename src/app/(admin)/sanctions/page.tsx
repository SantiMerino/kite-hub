import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SANCTION_TYPE_LABEL: Record<string, string> = {
  overdue: "Atraso",
  damage: "Daño",
  loss: "Pérdida",
  other: "Otro",
};

const SANCTION_STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  resolved: "Resuelta",
  appealed: "Apelada",
};

export default async function SanctionsPage() {
  const sanctions = await prisma.sanction.findMany({
    include: {
      student: { select: { id: true, name: true, cardKey: true } },
      loan: { include: { tool: { select: { name: true, toolId: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const active = sanctions.filter((s) => s.status === "active");
  const resolved = sanctions.filter((s) => s.status !== "active");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sanciones</h1>
        <p className="text-muted-foreground text-sm">
          Registro de sanciones y bloqueos por incumplimiento.
        </p>
      </div>

      <Card className="border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="size-4 text-purple-600" />
            Sanciones activas
            <Badge variant="alert">{active.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SanctionTable sanctions={active} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-muted-foreground">
            Historial resuelto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SanctionTable sanctions={resolved} />
        </CardContent>
      </Card>
    </div>
  );
}

type SanctionRow = {
  id: number;
  student: { id: number; name: string | null; cardKey: string | null };
  loan: { tool: { name: string; toolId: string } } | null;
  sanctionType: string;
  daysOverdue: number;
  description: string | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

function SanctionTable({ sanctions }: { sanctions: SanctionRow[] }) {
  if (sanctions.length === 0) {
    return <p className="text-sm text-muted-foreground py-3">Sin registros.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Estudiante</th>
            <th className="text-left py-2 pr-4 font-medium">Herramienta</th>
            <th className="text-left py-2 pr-4 font-medium">Tipo</th>
            <th className="text-left py-2 pr-4 font-medium">Días atraso</th>
            <th className="text-left py-2 pr-4 font-medium">Fecha</th>
            <th className="text-left py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {sanctions.map((s) => (
            <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-2.5 pr-4 font-medium">{s.student.name ?? s.student.cardKey}</td>
              <td className="py-2.5 pr-4 text-muted-foreground">
                {s.loan?.tool.name ?? "—"}
              </td>
              <td className="py-2.5 pr-4">
                <Badge variant="alert">{SANCTION_TYPE_LABEL[s.sanctionType] ?? s.sanctionType}</Badge>
              </td>
              <td className="py-2.5 pr-4 text-center font-semibold">
                {s.daysOverdue > 0 ? `${s.daysOverdue}d` : "—"}
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                {formatDate(s.createdAt)}
              </td>
              <td className="py-2.5">
                <Badge variant={s.status === "active" ? "overdue" : s.status === "resolved" ? "returned" : "alert"}>
                  {SANCTION_STATUS_LABEL[s.status] ?? s.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
