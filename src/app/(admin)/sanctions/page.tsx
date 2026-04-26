"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import QRCameraModal from "@/components/kiosk/QRCameraModal";
import { formatDate, isValidCardKey, normalizeCardKey } from "@/lib/utils";
import { AlertTriangle, Camera, Pencil, Trash2, UserRoundCheck } from "lucide-react";

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

type SanctionRow = {
  id: number;
  studentId: number;
  student: { id: number; name: string | null; cardKey: string | null };
  loan: { tool: { name: string; toolId: string } } | null;
  sanctionType: string;
  daysOverdue: number;
  description: string | null;
  appealMessage: string | null;
  startsAt: Date;
  endsAt: Date | null;
  isPermanent: boolean;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

/** Solo dígitos, máx. 6, para el sufijo del carné KEY_###### */
function sanitizeCardSuffix(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

function buildCardKey(sixDigits: string): string {
  const d = sixDigits.replace(/\D/g, "").slice(0, 6);
  return `KEY_${d.padStart(6, "0")}`;
}

export default function SanctionsPage() {
  const [sanctions, setSanctions] = useState<SanctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [cardSuffix, setCardSuffix] = useState("");
  const [showCardCamera, setShowCardCamera] = useState(false);
  const [loanId, setLoanId] = useState("");
  const [sanctionType, setSanctionType] = useState("other");
  const [description, setDescription] = useState("");
  const [daysOverdueValue, setDaysOverdueValue] = useState("0");
  const [isPermanent, setIsPermanent] = useState(true);
  const [endsAt, setEndsAt] = useState("");
  const [appealMessage, setAppealMessage] = useState(
    "Puedes apelar esta sanción con el equipo administrativo del laboratorio.",
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
    if (isValidCardKey(key)) {
      setCardSuffix(key.slice(4));
      return;
    }
    setError("QR inválido. Se esperaba un carné con formato KEY_000000.");
  }

  async function createSanction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      if (!cardSuffix.trim()) {
        setError("Introduce al menos un dígito de carné a la derecha de KEY_ o escanea el QR.");
        return;
      }
      const cardKey = buildCardKey(cardSuffix);
      if (!isValidCardKey(cardKey)) {
        setError("Carné inválido. Usa hasta 6 dígitos (KEY_ se completa a la izquierda) o escanea el QR.");
        return;
      }

      let loanIdNum: number | undefined;
      if (loanId.trim()) {
        const n = Number.parseInt(loanId, 10);
        if (!Number.isFinite(n) || n < 1) {
          setError("ID de préstamo inválido (número entero ≥ 1) o deja el campo vacío.");
          return;
        }
        loanIdNum = n;
      }
      const daysParsed = Number.parseInt(daysOverdueValue || "0", 10);
      const daysOverdue = Number.isFinite(daysParsed) && daysParsed >= 0 ? daysParsed : 0;

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
          endsAt: isPermanent ? null : (endsAt ? new Date(endsAt).toISOString() : undefined),
          appealMessage: appealMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail =
          data?.details && typeof data.details === "object"
            ? ` ${JSON.stringify(data.details)}`
            : "";
        throw new Error((data.error ?? "No se pudo crear la sanción.") + detail);
      }

      setMessage(`Sanción creada #${(data as SanctionRow).id} (${cardKey})`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear sanción.");
    }
  }

  async function updateStatus(
    sanctionId: number,
    status: "resolved" | "appealed",
  ) {
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
      setMessage(
        `Sanción #${(data as SanctionRow).id} ${
          status === "resolved" ? "levantada (resuelta)" : "en revisión (apelación)"
        }.`,
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar sanción.");
    }
  }

  async function deleteSanctionItem(sanctionId: number) {
    const confirmed = window.confirm("¿Eliminar este registro de sanción? Esta acción no se puede deshacer.");
    if (!confirmed) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/sanctions/${sanctionId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      setMessage(`Sanción #${sanctionId} eliminada.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar sanción.");
    }
  }

  const active = sanctions.filter((s) => s.status === "active");
  const resolved = sanctions.filter((s) => s.status !== "active");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sanciones</h1>
        <p className="text-muted-foreground text-sm">
          Registro por carné (KEY_######), opción de escanear el QR como en el kiosco.
        </p>
      </div>

      {message && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-3 text-sm text-emerald-700">{message}</CardContent>
        </Card>
      )}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Crear sanción</CardTitle>
        </CardHeader>
        <CardContent>
          {showCardCamera && (
            <QRCameraModal
              title="Escanear carné del estudiante"
              onClose={() => setShowCardCamera(false)}
              onScan={applyScannedCard}
            />
          )}

          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={createSanction}>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="card-suffix">Carné (identificador único)</Label>
              <p className="text-xs text-muted-foreground">
                Escribe los dígitos a la derecha; el prefijo <span className="font-mono">KEY_</span> es fijo.
                También puedes escanear el mismo QR que se usa en el kiosco.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                <div className="flex min-w-0 flex-1 max-w-md items-stretch rounded-md shadow-sm">
                  <span
                    className="inline-flex shrink-0 items-center rounded-l-md border border-input border-r-0 bg-muted px-3 font-mono text-sm text-muted-foreground select-none"
                    aria-hidden
                  >
                    KEY_
                  </span>
                  <Input
                    id="card-suffix"
                    className="rounded-l-none font-mono"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    placeholder="000000"
                    value={cardSuffix}
                    onChange={(e) => setCardSuffix(sanitizeCardSuffix(e.target.value))}
                    required
                    aria-label="Dígitos del carné (6 posiciones, se rellenan con ceros a la izquierda)"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0 gap-2"
                  onClick={() => {
                    setError(null);
                    setShowCardCamera(true);
                  }}
                >
                  <Camera className="size-4" aria-hidden />
                  Escanear carné
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="loanId">ID de préstamo (opcional, interno)</Label>
              <Input
                id="loanId"
                value={loanId}
                onChange={(e) => setLoanId(e.target.value)}
                placeholder="Si aplica, vincular a un préstamo concreto"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sanctionType">Tipo</Label>
              <select
                id="sanctionType"
                value={sanctionType}
                onChange={(e) => setSanctionType(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="overdue">Atraso</option>
                <option value="damage">Daño</option>
                <option value="loss">Pérdida</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="daysOverdue">Días de atraso (si aplica)</Label>
              <Input
                id="daysOverdue"
                type="number"
                min={0}
                value={daysOverdueValue}
                onChange={(e) => setDaysOverdueValue(e.target.value)}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="description">Razón u observación</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Breve descripción de la sanción"
              />
            </div>

            <div className="md:col-span-2">
              <div
                className="rounded-lg border-2 border-destructive/35 bg-destructive/5 p-4"
                role="group"
                aria-label="Bloqueo estricto"
              >
                <div className="mb-2 flex items-start gap-2 text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <div>
                    <p className="text-sm font-medium">Zona de bloqueo</p>
                    <p className="text-xs text-destructive/80">
                      Una sanción permanente no tiene fecha de fin: el laboratorio mantiene el
                      bloqueo hasta resolución manual.
                    </p>
                  </div>
                </div>
                <label className="mt-1 flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-destructive text-destructive focus:ring-destructive"
                    checked={isPermanent}
                    onChange={(e) => setIsPermanent(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium">Sanción permanente</span> — no definir fecha de
                    término automática
                  </span>
                </label>
              </div>
            </div>
            {!isPermanent && (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="endsAt">Termina el (fecha/hora límite)</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="appealMessage">Mensaje para apelación</Label>
              <Input
                id="appealMessage"
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">
                Registrar sanción
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="size-4 text-purple-600" />
            Sanciones activas
            <Badge variant="alert">{active.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-3">Cargando...</p>
          ) : (
            <SanctionTable
              sanctions={active}
              onLift={(id) => void updateStatus(id, "resolved")}
              onModifyAppeal={(id) => void updateStatus(id, "appealed")}
              onDelete={(id) => void deleteSanctionItem(id)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-muted-foreground">Historial (no activas)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-3">Cargando...</p>
          ) : (
            <SanctionTable
              sanctions={resolved}
              onLift={(id) => void updateStatus(id, "resolved")}
              onModifyAppeal={(id) => void updateStatus(id, "appealed")}
              onDelete={(id) => void deleteSanctionItem(id)}
              allowLiftAppeal={false}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SanctionTable({
  sanctions,
  onLift,
  onModifyAppeal,
  onDelete,
  allowLiftAppeal = true,
}: {
  sanctions: SanctionRow[];
  onLift: (id: number) => void;
  onModifyAppeal: (id: number) => void;
  onDelete: (id: number) => void;
  allowLiftAppeal?: boolean;
}) {
  if (sanctions.length === 0) {
    return <p className="text-sm text-muted-foreground py-3">Sin registros.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Carné</th>
            <th className="text-left py-2 pr-4 font-medium">Nombre</th>
            <th className="text-left py-2 pr-4 font-medium">Herramienta</th>
            <th className="text-left py-2 pr-4 font-medium">Tipo</th>
            <th className="text-left py-2 pr-4 font-medium">Días atraso</th>
            <th className="text-left py-2 pr-4 font-medium">Fecha</th>
            <th className="text-left py-2 font-medium">Estado</th>
            <th className="text-left py-2 font-medium">Bloqueo</th>
            <th className="w-[1%] text-right py-2 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sanctions.map((s) => (
            <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-2.5 pr-4 font-mono text-xs text-foreground">
                {s.student.cardKey ?? "—"}
              </td>
              <td className="py-2.5 pr-4 font-medium">{s.student.name ?? "—"}</td>
              <td className="py-2.5 pr-4 text-muted-foreground">
                {s.loan?.tool ? `${s.loan.tool.name} (${s.loan.tool.toolId})` : "—"}
              </td>
              <td className="py-2.5 pr-4">
                <Badge variant="alert">
                  {SANCTION_TYPE_LABEL[s.sanctionType] ?? s.sanctionType}
                </Badge>
              </td>
              <td className="py-2.5 pr-4 text-center font-semibold">
                {s.daysOverdue > 0 ? `${s.daysOverdue}d` : "—"}
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                {formatDate(s.createdAt)}
              </td>
              <td className="py-2.5">
                <Badge
                  variant={
                    s.status === "active" ? "overdue" : s.status === "resolved" ? "returned" : "alert"
                  }
                >
                  {SANCTION_STATUS_LABEL[s.status] ?? s.status}
                </Badge>
              </td>
              <td className="py-2.5 text-xs text-muted-foreground">
                {s.isPermanent
                  ? "Permanente"
                  : s.endsAt
                    ? `Hasta ${formatDate(s.endsAt)}`
                    : "Sin fecha de fin explícita"}
              </td>
              <td className="py-2.5">
                <div className="flex items-center justify-end gap-0.5">
                  {allowLiftAppeal && s.status === "active" && (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-violet-700"
                        onClick={() => onLift(s.id)}
                        title="Quitar: marcar la sanción como levantada o resuelta (deja de estar activa)."
                        aria-label="Quitar sanción: marcar como resuelta"
                      >
                        <UserRoundCheck className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-violet-700"
                        onClick={() => onModifyAppeal(s.id)}
                        title="Modificar: pasar a estado de apelación o revisión."
                        aria-label="Modificar: marcar en apelación"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => onDelete(s.id)}
                    title="Eliminar: borra el registro de la base de datos (irreversible)."
                    aria-label="Eliminar sanción"
                  >
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
