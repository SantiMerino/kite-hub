import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusFilter } from "../types";

type StudentsFiltersProps = {
  query: string;
  statusFilter: StatusFilter;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
};

export default function StudentsFilters({
  query,
  statusFilter,
  onQueryChange,
  onStatusChange,
}: StudentsFiltersProps) {
  return (
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
            onChange={(e) => onQueryChange(e.target.value)}
            autoComplete="off"
          />
          {query ? (
            <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground" onClick={() => onQueryChange("")}>
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5 w-full sm:w-56 shrink-0">
        <Label className="text-xs text-muted-foreground">Estado</Label>
        <Select value={statusFilter} onValueChange={(value) => onStatusChange(value as StatusFilter)}>
          <SelectTrigger aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Sin sancion ni bloqueo</SelectItem>
            <SelectItem value="sanctioned">Con sancion activa</SelectItem>
            <SelectItem value="banned">Bloqueado (admin)</SelectItem>
            <SelectItem value="has_loans">Con prestamo activo</SelectItem>
            <SelectItem value="overdue">Con prestamo vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
