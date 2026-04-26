"use client";

import { ReactNode, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, daysOverdue } from "@/lib/utils";

export const dynamic = "force-dynamic";

type LoanRow = {
  id: number;
  tool: { name: string; toolId: string };
  student: { id: number; name: string | null; cardKey: string | null; email?: string | null };
  borrowDate: Date;
  expectedReturnDate: Date;
  actualReturnDate?: Date | null;
  status: string;
  notes?: string | null;
};

type LoanPayload = {
  active: LoanRow[];
  requested: LoanRow[];
  overdue: LoanRow[];
  recent: LoanRow[];
  deniedOrCancelled: LoanRow[];
};

export default function LoansPage() {
  const [payload, setPayload] = useState<LoanPayload>({
    active: [],
    requested: [],
    overdue: [],
    recent: [],
    deniedOrCancelled: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/loans", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error cargando préstamos.");
      setPayload(data as LoanPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando préstamos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function executeAction(loanId: number, action: "approve" | "deny" | "cancel" | "return" | "delete") {
    setError(null);
    setMessage(null);
    try {
      let endpoint = "";
      let method: "POST" | "DELETE" = "POST";
      let body: Record<string, string> | undefined;

      if (action === "approve") endpoint = `/api/admin/loans/${loanId}/approve`;
      if (action === "return") endpoint = `/api/admin/loans/${loanId}/return`;
      if (action === "deny") {
        endpoint = `/api/admin/loans/${loanId}/deny`;
        const reason = window.prompt("Razón de denegación");
        if (!reason) return;
        body = { reason };
      }
      if (action === "cancel") {
        endpoint = `/api/admin/loans/${loanId}/cancel`;
        const reason = window.prompt("Razón de cancelación (opcional)") ?? "";
        body = { reason };
      }
      if (action === "delete") {
        const confirmed = window.confirm("¿Eliminar préstamo definitivamente?");
        if (!confirmed) return;
        endpoint = `/api/admin/loans/${loanId}`;
        method = "DELETE";
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Acción fallida.");

      setMessage(`Acción completada: ${action.toUpperCase()} #${loanId}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Préstamos</h1>
        <p className="text-muted-foreground text-sm">
          Flujo completo: requested, approved, denied, cancelled, activos y devoluciones.
        </p>
      </div>

      {message && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-3 text-sm text-emerald-700">{message}</CardContent>
        </Card>
      )}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Cargando...</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-violet-200 bg-violet-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-violet-700">
                Solicitudes pendientes ({payload.requested.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LoanTable
                loans={payload.requested}
                actions={(loan) => (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void executeAction(loan.id, "approve")}>Aprobar</Button>
                    <Button size="sm" variant="outline" onClick={() => void executeAction(loan.id, "deny")}>Denegar</Button>
                    <Button size="sm" variant="destructive" onClick={() => void executeAction(loan.id, "delete")}>Eliminar</Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-red-700">Vencidos ({payload.overdue.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <LoanTable
                loans={payload.overdue}
                showOverdue
                actions={(loan) => (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void executeAction(loan.id, "return")}>Registrar devolución</Button>
                    <Button size="sm" variant="outline" onClick={() => void executeAction(loan.id, "cancel")}>Cancelar</Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activos / aprobados ({payload.active.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <LoanTable
                loans={payload.active}
                actions={(loan) => (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void executeAction(loan.id, "return")}>Registrar devolución</Button>
                    <Button size="sm" variant="outline" onClick={() => void executeAction(loan.id, "cancel")}>Cancelar</Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">
                Denegados / cancelados ({payload.deniedOrCancelled.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LoanTable loans={payload.deniedOrCancelled} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">Últimas devoluciones</CardTitle>
            </CardHeader>
            <CardContent>
              <LoanTable loans={payload.recent} returned />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function LoanTable({
  loans,
  showOverdue = false,
  returned = false,
  actions,
}: {
  loans: LoanRow[];
  showOverdue?: boolean;
  returned?: boolean;
  actions?: (loan: LoanRow) => ReactNode;
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
            {actions && <th className="text-left py-2 font-medium">Acciones</th>}
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
