"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Camera, ChevronDown, ChevronRight, PlusCircle } from "lucide-react";
import QRCameraModal from "@/components/kiosk/QRCameraModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, isValidCardKey, normalizeCardKey } from "@/lib/utils";
import { kiteError, kiteWarning, kitePromise } from "@/lib/kite-sileo";
import SanctionsTable from "./components/SanctionsTable";
import {
  SANCTIONS_ADMIN_TABS,
  parseSanctionsAdminTabParam,
  type SanctionsAdminTabId,
} from "./sanctions-admin-tabs";
import { buildCardKey, sanitizeCardSuffix } from "./utils";
import { SanctionRow } from "./types";

function tabCount(activeLen: number, historialLen: number, tab: SanctionsAdminTabId): number {
  switch (tab) {
    case "activas":
      return activeLen;
    case "historial":
      return historialLen;
    default:
      return 0;
  }
}

export default function SanctionsAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo(
    () => parseSanctionsAdminTabParam(searchParams.get("tab")),
    [searchParams],
  );

  const setActiveTab = useCallback(
    (next: SanctionsAdminTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "activas") params.delete("tab");
      else params.set("tab", next);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [sanctions, setSanctions] = useState<SanctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [showCardCamera, setShowCardCamera] = useState(false);
  const [cardSuffix, setCardSuffix] = useState("");
  const [loanId, setLoanId] = useState("");
  const [sanctionType, setSanctionType] = useState("other");
  const [description, setDescription] = useState("");
  const [daysOverdueValue, setDaysOverdueValue] = useState("0");
  const [isPermanent, setIsPermanent] = useState(true);
  const [endsAt, setEndsAt] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sanctions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error cargando sanciones.");
      setSanctions(data as SanctionRow[]);
    } catch (err) {
      kiteError({
        title: "Error al cargar sanciones",
        description: err instanceof Error ? err.message : "No se pudieron cargar las sanciones.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function applyScannedCard(raw: string) {
    setShowCardCamera(false);
    const key = normalizeCardKey(raw);
    if (!isValidCardKey(key)) {
      kiteWarning({
        title: "QR inválido",
        description: "Se esperaba un carné con formato KEY_000000.",
      });
      return;
    }
    setCardSuffix(key.slice(4));
  }

  async function createSanction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!cardSuffix.trim()) throw new Error("Introduce al menos un dígito de carné.");
      const cardKey = buildCardKey(cardSuffix);
      if (!isValidCardKey(cardKey)) throw new Error("Carné inválido.");

      let loanIdNum: number | undefined;
      if (loanId.trim()) {
        const parsed = Number.parseInt(loanId, 10);
        if (!Number.isFinite(parsed) || parsed < 1) throw new Error("ID de préstamo inválido.");
        loanIdNum = parsed;
      }
      const parsedDays = Number.parseInt(daysOverdueValue || "0", 10);
      const daysOverdue = Number.isFinite(parsedDays) && parsedDays >= 0 ? parsedDays : 0;

      const doFetch = fetch("/api/admin/sanctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardKey,
          loanId: loanIdNum,
          sanctionType,
          daysOverdue,
          description: description || undefined,
          isPermanent,
          endsAt: isPermanent ? null : endsAt ? new Date(endsAt).toISOString() : undefined,
        }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo crear la sanción.");
        return data as SanctionRow;
      });

      await kitePromise(
        doFetch.then(async (sanction) => { await loadData(); return sanction; }),
        {
          loading: { title: "Registrando sanción…", description: cardKey },
          success: (sanction) => ({
            title: "Sanción registrada",
            description: `#${sanction.id} — ${cardKey}`,
          }),
          error: (err) => ({
            title: "No se pudo crear la sanción",
            description: err instanceof Error ? err.message : "Inténtalo de nuevo.",
          }),
        },
      );
    } catch (err) {
      kiteError({
        title: "Error de validación",
        description: err instanceof Error ? err.message : "Revisa los datos del formulario.",
      });
    }
  }

  async function resolveSanction(sanctionId: number) {
    const doFetch = fetch(`/api/admin/sanctions/${sanctionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar.");
      return data as SanctionRow;
    });

    await kitePromise(
      doFetch.then(async (sanction) => { await loadData(); return sanction; }),
      {
        loading: { title: "Actualizando sanción…" },
        success: (sanction) => ({ title: "Sanción resuelta", description: `Sanción #${sanction.id} — bloqueo levantado` }),
        error: (err) => ({
          title: "No se pudo actualizar",
          description: err instanceof Error ? err.message : "Inténtalo de nuevo.",
        }),
      },
    );
  }

  async function deleteSanction(sanctionId: number) {
    if (!window.confirm("¿Eliminar este registro de sanción?")) return;

    const doFetch = fetch(`/api/admin/sanctions/${sanctionId}`, { method: "DELETE" }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      return data;
    });

    await kitePromise(
      doFetch.then(async (d) => { await loadData(); return d; }),
      {
        loading: { title: "Eliminando sanción…" },
        success: () => ({
          title: "Sanción eliminada",
          description: `Registro #${sanctionId} eliminado.`,
        }),
        error: (err) => ({
          title: "No se pudo eliminar",
          description: err instanceof Error ? err.message : "Inténtalo de nuevo.",
        }),
      },
    );
  }

  const active = sanctions.filter((sanction) => sanction.status === "active");
  const resolved = sanctions.filter((sanction) => sanction.status !== "active");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sanciones</h1>
        <p className="text-muted-foreground text-sm">
          Registro por carné (KEY_######) con opción de escaneo QR. Lista en pestañas: activas e historial.
        </p>
      </div>

      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={() => setIsCreateFormOpen((prev) => !prev)}
            className="flex min-h-8 w-full items-center text-left"
            aria-expanded={isCreateFormOpen}
            aria-label={`${isCreateFormOpen ? "Contraer" : "Expandir"} formulario de registro de sanción`}
          >
            <CardTitle className="flex items-center gap-2 text-base leading-none">
              {isCreateFormOpen ? (
                <ChevronDown className="size-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <ChevronRight className="size-4 text-purple-600 dark:text-purple-400" />
              )}
              <PlusCircle className="size-4 text-purple-600 dark:text-purple-400" />
              Registrar sanción
            </CardTitle>
          </button>
        </CardHeader>
        {isCreateFormOpen && (
        <CardContent>
          {showCardCamera && (
            <QRCameraModal title="Escanear carne del estudiante" onClose={() => setShowCardCamera(false)} onScan={applyScannedCard} />
          )}
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={createSanction}>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="card-suffix">Carne</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                <div className="flex min-w-0 flex-1 max-w-md items-stretch rounded-md shadow-sm">
                  <span className="inline-flex shrink-0 items-center rounded-l-md border border-input border-r-0 bg-muted px-3 font-mono text-sm text-muted-foreground">KEY_</span>
                  <Input id="card-suffix" className="rounded-l-none font-mono" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="000000" value={cardSuffix} onChange={(e) => setCardSuffix(sanitizeCardSuffix(e.target.value))} required />
                </div>
                <Button type="button" variant="secondary" className="shrink-0 gap-2" onClick={() => setShowCardCamera(true)}>
                  <Camera className="size-4" />
                  Escanear carne
                </Button>
              </div>
            </div>
            <div className="space-y-1"><Label htmlFor="loanId">ID de prestamo (opcional)</Label><Input id="loanId" value={loanId} onChange={(e) => setLoanId(e.target.value)} className="font-mono text-sm" /></div>
            <div className="space-y-1">
              <Label htmlFor="sanctionType">Tipo</Label>
              <Select value={sanctionType} onValueChange={setSanctionType}>
                <SelectTrigger id="sanctionType" className="w-full bg-background text-foreground">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overdue">Atraso</SelectItem>
                  <SelectItem value="damage">Daño</SelectItem>
                  <SelectItem value="loss">Pérdida</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label htmlFor="daysOverdue">Dias de atraso</Label><Input id="daysOverdue" type="number" min={0} value={daysOverdueValue} onChange={(e) => setDaysOverdueValue(e.target.value)} /></div>
            <div className="space-y-1 md:col-span-2"><Label htmlFor="description">Descripcion</Label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" /></div>
            <div className="md:col-span-2">
              <div className="rounded-lg border-2 border-destructive/35 bg-destructive/5 p-4" role="group" aria-label="Bloqueo estricto">
                <div className="mb-2 flex items-start gap-2 text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p className="text-xs text-destructive/80">Una sancion permanente no tiene fecha de fin.</p></div>
                <label className="mt-1 flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 size-4" checked={isPermanent} onChange={(e) => setIsPermanent(e.target.checked)} /><span><span className="font-medium">Sancion permanente</span></span></label>
              </div>
            </div>
            {!isPermanent && <div className="space-y-1 md:col-span-2"><Label htmlFor="endsAt">Termina el</Label><Input id="endsAt" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>}
            <div className="md:col-span-2"><Button type="submit" className="w-full sm:w-auto">Registrar sancion</Button></div>
          </form>
        </CardContent>
        )}
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Cargando…</CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SanctionsAdminTabId)} className="gap-4">
          <TabsList aria-label="Secciones de sanciones" className="h-auto w-full flex-wrap justify-start gap-1 py-1.5">
            {SANCTIONS_ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const n = tabCount(active.length, resolved.length, tab.id);
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

          <TabsContent value="activas" className="mt-0">
            <Card className="border-purple-200 dark:border-purple-800/45">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="size-4 text-purple-600 dark:text-purple-400" aria-hidden />
                  Sanciones activas
                  <Badge variant="alert">{active.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SanctionsTable
                  sanctions={active}
                  onResolve={(id) => void resolveSanction(id)}
                  onDelete={(id) => void deleteSanction(id)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-muted-foreground">Historial (no activas)</CardTitle>
              </CardHeader>
              <CardContent>
                <SanctionsTable
                  sanctions={resolved}
                  onDelete={(id) => void deleteSanction(id)}
                  allowResolve={false}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
