"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StudentsFilters from "./components/StudentsFilters";
import StudentsTable from "./components/StudentsTable";
import { StatusFilter, StudentRow } from "./types";
import { filterStudents } from "./utils";
import { kiteError } from "@/lib/kite-sileo";

export default function StudentsAdminPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/students", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error cargando estudiantes.");
        if (cancelled) return;
        setStudents((data as StudentRow[]).map((student) => ({
          ...student,
          createdAt: typeof student.createdAt === "string" ? student.createdAt : String(student.createdAt),
        })));
      } catch (err) {
        if (!cancelled) {
          kiteError({
            title: "Error al cargar estudiantes",
            description: err instanceof Error ? err.message : "No se pudieron cargar los estudiantes.",
          });
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

  const filteredStudents = useMemo(
    () => filterStudents(students, query, statusFilter),
    [students, query, statusFilter],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estudiantes</h1>
        <p className="text-muted-foreground text-sm">Directorio de estudiantes registrados en el sistema.</p>
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-blue-600 dark:text-muted-foreground" />
            Todos los estudiantes
            <Badge variant="loan">{loading ? "…" : filteredStudents.length}</Badge>
            {!loading && students.length !== filteredStudents.length && (
              <span className="text-xs font-normal text-muted-foreground">de {students.length}</span>
            )}
          </CardTitle>

          <StudentsFilters
            query={query}
            statusFilter={statusFilter}
            onQueryChange={setQuery}
            onStatusChange={setStatusFilter}
          />
        </CardHeader>
        <CardContent>
          <StudentsTable loading={loading} students={filteredStudents} />
          {!loading && filteredStudents.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {students.length === 0 ? "No hay estudiantes registrados." : "Ningun estudiante coincide con los filtros."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
