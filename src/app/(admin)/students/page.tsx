"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatDate } from "@/lib/utils";
import { Users, ShieldAlert, Search, X } from "lucide-react";

type StudentRow = {
  id: number;
  name: string | null;
  cardKey: string | null;
  email: string | null;
  isBanned: boolean;
  createdAt: string;
  loans: { id: number; status: string }[];
  sanctions: { id: number }[];
};

type StatusFilter = "all" | "active" | "sanctioned" | "banned" | "has_loans" | "overdue";

function studentUiStatus(s: StudentRow): StatusFilter {
  if (s.isBanned) return "banned";
  if (s.sanctions.length > 0) return "sanctioned";
  return "active";
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/students", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error cargando estudiantes.");
        if (!cancelled) {
          setStudents(
            (data as StudentRow[]).map((u) => ({
              ...u,
              createdAt: typeof u.createdAt === "string" ? u.createdAt : String(u.createdAt),
            })),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No se pudieron cargar los estudiantes.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const name = (s.name ?? "").toLowerCase();
      const card = (s.cardKey ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const matchesQuery =
        !q || name.includes(q) || card.includes(q) || email.includes(q);

      const overdueCount = s.loans.filter((l) => l.status === "overdue").length;
      const ui = studentUiStatus(s);

      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = ui === "active";
      else if (statusFilter === "sanctioned") matchesStatus = ui === "sanctioned";
      else if (statusFilter === "banned") matchesStatus = ui === "banned";
      else if (statusFilter === "has_loans") matchesStatus = s.loans.length > 0;
      else if (statusFilter === "overdue") matchesStatus = overdueCount > 0;

      return matchesQuery && matchesStatus;
    });
  }, [students, query, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estudiantes</h1>
        <p className="text-muted-foreground text-sm">
          Directorio de estudiantes registrados en el sistema.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-blue-600" />
            Todos los estudiantes
            <Badge variant="loan">{loading ? "…" : filtered.length}</Badge>
            {!loading && students.length !== filtered.length && (
              <span className="text-xs font-normal text-muted-foreground">
                de {students.length}
              </span>
            )}
          </CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5 flex-1 min-w-0">
              <Label htmlFor="student-search" className="text-xs text-muted-foreground">
                Buscar por carné, nombre o correo
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="student-search"
                  className="pl-9 pr-9"
                  placeholder="Ej. KEY_, nombre…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
                {query ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setQuery("")}
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5 w-full sm:w-56 shrink-0">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger aria-label="Filtrar por estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Sin sanción ni bloqueo</SelectItem>
                  <SelectItem value="sanctioned">Con sanción activa</SelectItem>
                  <SelectItem value="banned">Bloqueado (admin)</SelectItem>
                  <SelectItem value="has_loans">Con préstamo activo</SelectItem>
                  <SelectItem value="overdue">Con préstamo vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4" role="alert">
              {error}
            </p>
          )}
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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      Cargando…
                    </td>
                  </tr>
                ) : (
                  filtered.map((student) => {
                    const overdueCount = student.loans.filter((l) => l.status === "overdue").length;
                    return (
                      <tr key={student.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2.5 pr-4 font-medium">
                          {student.isBanned && (
                            <ShieldAlert className="inline size-3.5 mr-1 text-red-600" aria-hidden />
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
                          {formatDate(new Date(student.createdAt))}
                        </td>
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
                            <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold tracking-wide text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
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
            {!loading && filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {students.length === 0
                  ? "No hay estudiantes registrados."
                  : "Ningún estudiante coincide con los filtros."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
