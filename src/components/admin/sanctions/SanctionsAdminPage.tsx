"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, Camera } from "lucide-react";
import QRCameraModal from "@/components/kiosk/QRCameraModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidCardKey, normalizeCardKey } from "@/lib/utils";
import SanctionsTable from "./components/SanctionsTable";
import { buildCardKey, sanitizeCardSuffix } from "./utils";
import { SanctionRow } from "./types";

export default function SanctionsAdminPage() {
  const [sanctions, setSanctions] = useState<SanctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCardCamera, setShowCardCamera] = useState(false);
  const [cardSuffix, setCardSuffix] = useState("");
  const [loanId, setLoanId] = useState("");
  const [sanctionType, setSanctionType] = useState("other");
  const [description, setDescription] = useState("");
  const [daysOverdueValue, setDaysOverdueValue] = useState("0");
  const [isPermanent, setIsPermanent] = useState(true);
  const [endsAt, setEndsAt] = useState("");
  const [appealMessage, setAppealMessage] = useState(
    "Puedes apelar esta sancion con el equipo administrativo del laboratorio.",
  );

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sanctions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error cargando sanciones.");
      setSanctions(data as SanctionRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar sanciones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function applyScannedCard(raw: string) {
    setShowCardCamera(false);
    setError(null);
    const key = normalizeCardKey(raw);
    if (!isValidCardKey(key)) {
      setError("QR invalido. Se esperaba un carne con formato KEY_000000.");
      return;
    }
    setCardSuffix(key.slice(4));
  }

  async function createSanction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      if (!cardSuffix.trim()) throw new Error("Introduce al menos un digito de carne.");
      const cardKey = buildCardKey(cardSuffix);
      if (!isValidCardKey(cardKey)) throw new Error("Carne invalido.");

      let loanIdNum: number | undefined;
      if (loanId.trim()) {
        const parsed = Number.parseInt(loanId, 10);
        if (!Number.isFinite(parsed) || parsed < 1) throw new Error("ID de prestamo invalido.");
        loanIdNum = parsed;
      }
      const parsedDays = Number.parseInt(daysOverdueValue || "0", 10);
      const daysOverdue = Number.isFinite(parsedDays) && parsedDays >= 0 ? parsedDays : 0;

      const res = await fetch("/api/admin/sanctions", {
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
          appealMessage: appealMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la sancion.");

      setMessage(`Sancion creada #${(data as SanctionRow).id} (${cardKey})`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear sancion.");
    }
  }

  async function updateStatus(sanctionId: number, status: "resolved" | "appealed") {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/sanctions/${sanctionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar.");
      setMessage(`Sancion #${(data as SanctionRow).id} actualizada.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar sancion.");
    }
  }

  async function deleteSanction(sanctionId: number) {
    if (!window.confirm("¿Eliminar este registro de sancion?")) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/sanctions/${sanctionId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      setMessage(`Sancion #${sanctionId} eliminada.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar sancion.");
    }
  }

  const active = sanctions.filter((sanction) => sanction.status === "active");
  const resolved = sanctions.filter((sanction) => sanction.status !== "active");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sanciones</h1>
        <p className="text-muted-foreground text-sm">Registro por carne (KEY_######) con opcion de escaneo QR.</p>
      </div>

      {message && <Card className="border-emerald-200 bg-emerald-50"><CardContent className="py-3 text-sm text-emerald-700">{message}</CardContent></Card>}
      {error && <Card className="border-destructive/30 bg-destructive/5"><CardContent className="py-3 text-sm text-destructive">{error}</CardContent></Card>}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Crear sancion</CardTitle></CardHeader>
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
              <select id="sanctionType" value={sanctionType} onChange={(e) => setSanctionType(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="overdue">Atraso</option><option value="damage">Dano</option><option value="loss">Perdida</option><option value="other">Otro</option>
              </select>
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
            <div className="space-y-1 md:col-span-2"><Label htmlFor="appealMessage">Mensaje para apelacion</Label><Input id="appealMessage" value={appealMessage} onChange={(e) => setAppealMessage(e.target.value)} /></div>
            <div className="md:col-span-2"><Button type="submit" className="w-full sm:w-auto">Registrar sancion</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-purple-200">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="size-4 text-purple-600" />Sanciones activas <Badge variant="alert">{active.length}</Badge></CardTitle></CardHeader>
        <CardContent>{loading ? <p className="text-sm text-muted-foreground py-3">Cargando...</p> : <SanctionsTable sanctions={active} onLift={(id) => void updateStatus(id, "resolved")} onModifyAppeal={(id) => void updateStatus(id, "appealed")} onDelete={(id) => void deleteSanction(id)} />}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base text-muted-foreground">Historial (no activas)</CardTitle></CardHeader>
        <CardContent>{loading ? <p className="text-sm text-muted-foreground py-3">Cargando...</p> : <SanctionsTable sanctions={resolved} onLift={(id) => void updateStatus(id, "resolved")} onModifyAppeal={(id) => void updateStatus(id, "appealed")} onDelete={(id) => void deleteSanction(id)} allowLiftAppeal={false} />}</CardContent>
      </Card>
    </div>
  );
}
