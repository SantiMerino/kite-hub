import { Pencil, Trash2, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { SANCTION_STATUS_LABEL, SANCTION_TYPE_LABEL } from "../constants";
import { SanctionRow } from "../types";

type SanctionsTableProps = {
  sanctions: SanctionRow[];
  onLift: (id: number) => void;
  onModifyAppeal: (id: number) => void;
  onDelete: (id: number) => void;
  allowLiftAppeal?: boolean;
};

export default function SanctionsTable({
  sanctions,
  onLift,
  onModifyAppeal,
  onDelete,
  allowLiftAppeal = true,
}: SanctionsTableProps) {
  if (sanctions.length === 0) return <p className="text-sm text-muted-foreground py-3">Sin registros.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Carne</th>
            <th className="text-left py-2 pr-4 font-medium">Nombre</th>
            <th className="text-left py-2 pr-4 font-medium">Herramienta</th>
            <th className="text-left py-2 pr-4 font-medium">Tipo</th>
            <th className="text-left py-2 pr-4 font-medium">Dias atraso</th>
            <th className="text-left py-2 pr-4 font-medium">Fecha</th>
            <th className="text-left py-2 font-medium">Estado</th>
            <th className="text-left py-2 font-medium">Bloqueo</th>
            <th className="w-[1%] text-right py-2 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sanctions.map((sanction) => (
            <tr key={sanction.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-2.5 pr-4 font-mono text-xs">{sanction.student.cardKey ?? "—"}</td>
              <td className="py-2.5 pr-4 font-medium">{sanction.student.name ?? "—"}</td>
              <td className="py-2.5 pr-4 text-muted-foreground">
                {sanction.loan?.tool ? `${sanction.loan.tool.name} (${sanction.loan.tool.toolId})` : "—"}
              </td>
              <td className="py-2.5 pr-4">
                <Badge variant="alert">{SANCTION_TYPE_LABEL[sanction.sanctionType] ?? sanction.sanctionType}</Badge>
              </td>
              <td className="py-2.5 pr-4 text-center font-semibold">
                {sanction.daysOverdue > 0 ? `${sanction.daysOverdue}d` : "—"}
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground text-xs">{formatDate(sanction.createdAt)}</td>
              <td className="py-2.5">
                <Badge variant={sanction.status === "active" ? "overdue" : sanction.status === "resolved" ? "returned" : "alert"}>
                  {SANCTION_STATUS_LABEL[sanction.status] ?? sanction.status}
                </Badge>
              </td>
              <td className="py-2.5 text-xs text-muted-foreground">
                {sanction.isPermanent ? "Permanente" : sanction.endsAt ? `Hasta ${formatDate(sanction.endsAt)}` : "Sin fecha de fin explicita"}
              </td>
              <td className="py-2.5">
                <div className="flex items-center justify-end gap-0.5">
                  {allowLiftAppeal && sanction.status === "active" && (
                    <>
                      <Button type="button" size="icon" variant="ghost" className="text-violet-700" onClick={() => onLift(sanction.id)}>
                        <UserRoundCheck className="size-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="text-violet-700" onClick={() => onModifyAppeal(sanction.id)}>
                        <Pencil className="size-4" />
                      </Button>
                    </>
                  )}
                  <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(sanction.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
