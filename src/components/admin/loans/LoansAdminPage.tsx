"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { kiteError, kitePromise, kiteSuccess, kiteWarning, kiteAction } from "@/lib/kite-sileo";
import LoansTable from "./components/LoansTable";
import {
  LOANS_ADMIN_TABS,
  parseLoansAdminTabParam,
  type LoansAdminTabId,
} from "./loans-admin-tabs";
import { EMPTY_LOAN_PAYLOAD } from "./constants";
import { LoanPayload, LoanRow } from "./types";

function tabCount(payload: LoanPayload, tab: LoansAdminTabId): number {
  switch (tab) {
    case "pendientes":   return payload.requested.length;
    case "vencidos":     return payload.overdue.length;
    case "activos":      return payload.active.length;
    case "denegados":    return payload.deniedOrCancelled.length;
    case "devoluciones": return payload.recent.length;
    default:             return 0;
  }
}

export default function LoansAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo(
    () => parseLoansAdminTabParam(searchParams.get("tab")),
    [searchParams],
  );

  const setActiveTab = useCallback(
    (next: LoansAdminTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "pendientes") params.delete("tab");
      else params.set("tab", next);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [payload, setPayload] = useState<LoanPayload>(EMPTY_LOAN_PAYLOAD);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const res = fetch("/api/admin/loans", { cache: "no-store" });
    await kitePromise(
      res.then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Error cargando prestamos.");
        return data as LoanPayload;
      }),
      {
        loading: { title: "Cargando préstamos…" },
        success: (data) => {
          setPayload(data);
          setLoading(false);
          return { title: "Préstamos cargados" };
        },
        error: (err) => {
          setLoading(false);
          return {
            title: "Error al cargar",
            description: err instanceof Error ? err.message : "No se pudo cargar la lista.",
          };
        },
      },
    );
  }

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function executeAction(
    loanId: number,
    action: "approve" | "deny" | "cancel" | "return" | "delete",
    extraData?: { cardKey?: string | null },
  ) {
    let endpoint = "";
    let method: "POST" | "DELETE" = "POST";
    let body: Record<string, string> | undefined;

    if (action === "approve") endpoint = `/api/admin/loans/${loanId}/approve`;
    if (action === "return")  endpoint = `/api/admin/loans/${loanId}/return`;
    if (action === "deny") {
      endpoint = `/api/admin/loans/${loanId}/deny`;
      const reason = window.prompt("Razón de denegación");
      if (!reason) return;
      body = { reason };
    }
    if (action === "cancel") {
      endpoint = `/api/admin/loans/${loanId}/cancel`;
      body = { reason: window.prompt("Razón de cancelación (opcional)") ?? "" };
    }
    if (action === "delete") {
      if (!window.confirm("¿Eliminar préstamo definitivamente?")) return;
      endpoint = `/api/admin/loans/${loanId}`;
      method = "DELETE";
    }

    const doFetch = fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Acción fallida.");
      return data;
    });

    const actionLabel: Record<typeof action, string> = {
      approve: "Préstamo aprobado",
      deny:    "Solicitud denegada",
      cancel:  "Préstamo cancelado",
      return:  "Devolución registrada",
      delete:  "Préstamo eliminado",
    };

    if (action === "cancel") {
      await kiteWarning({
        title: "Cancelando préstamo…",
        description: `Préstamo #${loanId}`,
      });
      try {
        await doFetch;
        await loadData();
        kiteWarning({ title: actionLabel.cancel, description: `Préstamo #${loanId} cancelado.` });
      } catch (err) {
        kiteError({ title: "No se pudo cancelar", description: err instanceof Error ? err.message : undefined });
      }
      return;
    }

    await kitePromise(
      doFetch.then(async (data) => { await loadData(); return data; }),
      {
        loading: { title: `${actionLabel[action]}…`, description: `Préstamo #${loanId}` },
        success: (data) => {
          if (action === "return" && extraData?.cardKey) {
            const cardKey = extraData.cardKey;
            setTimeout(() => {
              kiteAction({
                title: "Ver historial del estudiante",
                description: "La devolución quedó registrada en auditoría.",
                button: {
                  title: "Auditoría",
                  onClick: () => router.push(`/admin/audit/${encodeURIComponent(cardKey)}`),
                },
              });
            }, 600);
          }
          void data;
          return { title: actionLabel[action], description: `Préstamo #${loanId}` };
        },
        error: (err) => ({
          title: "Acción fallida",
          description: err instanceof Error ? err.message : "Intenta de nuevo.",
        }),
      },
    );
  }

  type LoanAction = "approve" | "deny" | "cancel" | "return" | "delete";

  function actionsFor(
    loan: LoanRow,
    actions: Array<{ label: string; variant?: "default" | "outline" | "destructive"; action: LoanAction }>,
  ) {
    return (
      <div className="flex flex-wrap gap-2">
        {actions.map(({ label, variant = "default", action }) => (
          <Button
            key={action}
            size="sm"
            variant={variant}
            onClick={() => void executeAction(loan.id, action, { cardKey: loan.student.cardKey })}
          >
            {label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Préstamos</h1>
        <p className="text-muted-foreground text-sm">
          Una vista por pestaña: pendientes, vencidos, activos, denegados y últimas devoluciones.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Cargando...</CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LoansAdminTabId)} className="gap-4">
          <TabsList aria-label="Secciones de préstamos" className="h-auto w-full flex-wrap justify-start gap-1 py-1.5">
            {LOANS_ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const n = tabCount(payload, tab.id);
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn("group gap-1.5 px-2.5 py-2 sm:flex-initial", tab.triggerClass)}
                >
                  <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                      tab.countClass,
                    )}
                  >
                    {n}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="pendientes" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <LoansTable
                  loans={payload.requested}
                  actions={(loan) => actionsFor(loan, [
                    { label: "Aprobar",  action: "approve" },
                    { label: "Denegar",  action: "deny",   variant: "outline" },
                    { label: "Eliminar", action: "delete", variant: "destructive" },
                  ])}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vencidos" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <LoansTable
                  loans={payload.overdue}
                  showOverdue
                  actions={(loan) => actionsFor(loan, [
                    { label: "Registrar devolución", action: "return" },
                    { label: "Cancelar",             action: "cancel", variant: "outline" },
                  ])}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activos" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <LoansTable
                  loans={payload.active}
                  actions={(loan) => actionsFor(loan, [
                    { label: "Registrar devolución", action: "return" },
                    { label: "Cancelar",             action: "cancel", variant: "outline" },
                  ])}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="denegados" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <LoansTable loans={payload.deniedOrCancelled} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devoluciones" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <LoansTable loans={payload.recent} returned />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
