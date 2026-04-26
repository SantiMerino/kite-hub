"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoansTable from "./components/LoansTable";
import { EMPTY_LOAN_PAYLOAD } from "./constants";
import { LoanPayload } from "./types";

export default function LoansAdminPage() {
  const [payload, setPayload] = useState<LoanPayload>(EMPTY_LOAN_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/loans", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error cargando prestamos.");
      setPayload(data as LoanPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando prestamos.");
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
        const reason = window.prompt("Razon de denegacion");
        if (!reason) return;
        body = { reason };
      }
      if (action === "cancel") {
        endpoint = `/api/admin/loans/${loanId}/cancel`;
        body = { reason: window.prompt("Razon de cancelacion (opcional)") ?? "" };
      }
      if (action === "delete") {
        if (!window.confirm("¿Eliminar prestamo definitivamente?")) return;
        endpoint = `/api/admin/loans/${loanId}`;
        method = "DELETE";
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Accion fallida.");

      setMessage(`Accion completada: ${action.toUpperCase()} #${loanId}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la accion.");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prestamos</h1>
        <p className="text-muted-foreground text-sm">Flujo completo: requested, approved, denied, cancelled, activos y devoluciones.</p>
      </div>

      {message && <Card className="border-emerald-200 bg-emerald-50"><CardContent className="py-3 text-sm text-emerald-700">{message}</CardContent></Card>}
      {error && <Card className="border-red-200 bg-red-50"><CardContent className="py-3 text-sm text-red-700">{error}</CardContent></Card>}

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando...</CardContent></Card>
      ) : (
        <>
          <Card className="border-violet-200 bg-violet-50/40">
            <CardHeader className="pb-3"><CardTitle className="text-base text-violet-700">Solicitudes pendientes ({payload.requested.length})</CardTitle></CardHeader>
            <CardContent><LoansTable loans={payload.requested} actions={(loan) => <div className="flex gap-2"><Button size="sm" onClick={() => void executeAction(loan.id, "approve")}>Aprobar</Button><Button size="sm" variant="outline" onClick={() => void executeAction(loan.id, "deny")}>Denegar</Button><Button size="sm" variant="destructive" onClick={() => void executeAction(loan.id, "delete")}>Eliminar</Button></div>} /></CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/40">
            <CardHeader className="pb-3"><CardTitle className="text-base text-red-700">Vencidos ({payload.overdue.length})</CardTitle></CardHeader>
            <CardContent><LoansTable loans={payload.overdue} showOverdue actions={(loan) => <div className="flex gap-2"><Button size="sm" onClick={() => void executeAction(loan.id, "return")}>Registrar devolucion</Button><Button size="sm" variant="outline" onClick={() => void executeAction(loan.id, "cancel")}>Cancelar</Button></div>} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Activos / aprobados ({payload.active.length})</CardTitle></CardHeader>
            <CardContent><LoansTable loans={payload.active} actions={(loan) => <div className="flex gap-2"><Button size="sm" onClick={() => void executeAction(loan.id, "return")}>Registrar devolucion</Button><Button size="sm" variant="outline" onClick={() => void executeAction(loan.id, "cancel")}>Cancelar</Button></div>} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base text-muted-foreground">Denegados / cancelados ({payload.deniedOrCancelled.length})</CardTitle></CardHeader>
            <CardContent><LoansTable loans={payload.deniedOrCancelled} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base text-muted-foreground">Ultimas devoluciones</CardTitle></CardHeader>
            <CardContent><LoansTable loans={payload.recent} returned /></CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
