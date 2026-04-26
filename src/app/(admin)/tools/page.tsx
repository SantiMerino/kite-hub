"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import QRCameraModal from "@/components/kiosk/QRCameraModal";
import { cn } from "@/lib/utils";
import {
  Wrench, Trash2, Save, PlusCircle, Camera, Filter,
  ChevronRight, ChevronDown, Info, Check, X, Plus,
  MapPin, Tag,
} from "lucide-react";

type ToolCondition = "excellent" | "good" | "fair" | "poor";

type ToolRow = {
  id: number;
  toolId: string;
  prefix: string;
  name: string;
  description: string | null;
  category: string;
  condition: ToolCondition;
  location: string;
  requiresApproval: boolean;
  inventory: {
    availableQuantity: number;
    totalQuantity: number;
  } | null;
};

type PrefixSuggestion = { prefix: string; nextToolId: string };

type ToolCategory = { id: number; name: string; description?: string | null };
type ToolLocation = { id: number; name: string; locationType: string; area: string };

// ─── Inline combobox for categories / locations ───────────────────────────────
function CatalogCombobox({
  value,
  onChange,
  items,
  placeholder,
  onCreateItem,
  onDeleteItem,
  createLabel = "Crear",
}: {
  value: string;
  onChange: (v: string) => void;
  items: { id: number; name: string }[];
  placeholder?: string;
  onCreateItem: (name: string) => Promise<void>;
  onDeleteItem: (id: number, name: string) => Promise<boolean>;
  createLabel?: string;
}) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setInput(value); }, [value]);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(input.toLowerCase())
  );
  const exactMatch = items.some(
    (i) => i.name.toLowerCase() === input.trim().toLowerCase()
  );

  async function handleCreate() {
    const name = input.trim();
    if (!name || exactMatch) return;
    setCreating(true);
    try {
      await onCreateItem(name);
      onChange(name);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    const ok = await onDeleteItem(id, name);
    if (ok) setConfirmId(null);
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={input}
        onChange={(e) => { setInput(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => { setOpen(false); setConfirmId(null); }, 180)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-9"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-md border bg-popover shadow-lg text-sm">
          {filtered.map((item) => (
            <div key={item.id} className="group flex items-center gap-1 px-3 py-2 hover:bg-accent cursor-pointer">
              <span
                className="flex-1"
                onMouseDown={(e) => { e.preventDefault(); onChange(item.name); setInput(item.name); setOpen(false); }}
              >
                {item.name}
              </span>
              {confirmId === item.id ? (
                <span className="flex items-center gap-2 text-xs shrink-0">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); void handleDelete(item.id, item.name); }}
                    className="text-destructive hover:underline font-medium"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setConfirmId(null); }}
                    className="text-muted-foreground hover:underline"
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setConfirmId(item.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                  title="Eliminar"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          {!exactMatch && input.trim() && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); void handleCreate(); }}
              disabled={creating}
              className="flex w-full items-center gap-2 px-3 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-accent font-medium border-t"
            >
              <Plus className="size-3.5" />
              {creating ? "Creando…" : `${createLabel} "${input.trim()}"`}
            </button>
          )}
          {filtered.length === 0 && !input.trim() && (
            <p className="px-3 py-2 text-muted-foreground text-xs">Empieza a escribir para filtrar o crear.</p>
          )}
        </div>
      )}
    </div>
  );
}

const CONDITION_LABEL: Record<ToolCondition, string> = {
  excellent: "Excelente",
  good: "Bueno",
  fair: "Regular",
  poor: "Malo",
};

const CONDITION_VARIANT: Record<ToolCondition, "returned" | "loan" | "alert" | "overdue"> = {
  excellent: "returned",
  good: "loan",
  fair: "alert",
  poor: "overdue",
};

const INITIAL_FORM = {
  toolId: "",
  name: "",
  description: "",
  category: "",
  location: "",
  condition: "good" as ToolCondition,
  requiresApproval: false,
};

/** Normaliza texto leído por QR/cámara al código de herramienta (ej. MAR_001). */
function normalizeScannedToolCode(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  const match = trimmed.match(/([A-Z0-9]{2,10}_\d{3})/);
  return (match?.[1] ?? trimmed).replace(/\s+/g, "");
}

type SortKey = "name" | "toolId" | "category" | "location" | "availability";
type SortDir = "asc" | "desc";
type AvailabilityFilter = "all" | "available" | "unavailable";

function clusterToolsByPrefix(toolsInCategory: ToolRow[]): { prefix: string; items: ToolRow[] }[] {
  const sorted = [...toolsInCategory].sort(
    (a, b) => a.prefix.localeCompare(b.prefix) || a.toolId.localeCompare(b.toolId),
  );
  const clusters: { prefix: string; items: ToolRow[] }[] = [];
  for (const t of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && last.prefix === t.prefix) {
      last.items.push(t);
    } else {
      clusters.push({ prefix: t.prefix, items: [t] });
    }
  }
  return clusters;
}

const CLUSTER_ACCENTS = [
  {
    cardBorder: "border-[#006FFF]/35 dark:border-[#006FFF]/45",
    cardHeaderBg: "bg-[#006FFF]/6 dark:bg-[#006FFF]/12",
    border: "border-l-[#006FFF]",
    softBg: "bg-[#006FFF]/10 dark:bg-[#006FFF]/16",
    rowBg: "bg-[#006FFF]/6 dark:bg-[#006FFF]/10",
    text: "text-[#006FFF]",
  },
  {
    cardBorder: "border-[#9746FF]/35 dark:border-[#9746FF]/45",
    cardHeaderBg: "bg-[#9746FF]/6 dark:bg-[#9746FF]/12",
    border: "border-l-[#9746FF]",
    softBg: "bg-[#9746FF]/10 dark:bg-[#9746FF]/16",
    rowBg: "bg-[#9746FF]/6 dark:bg-[#9746FF]/10",
    text: "text-[#9746FF]",
  },
  {
    cardBorder: "border-[#00E379]/35 dark:border-[#00E379]/45",
    cardHeaderBg: "bg-[#00E379]/6 dark:bg-[#00E379]/12",
    border: "border-l-[#00E379]",
    softBg: "bg-[#00E379]/10 dark:bg-[#00E379]/16",
    rowBg: "bg-[#00E379]/6 dark:bg-[#00E379]/10",
    text: "text-[#00E379]",
  },
  {
    cardBorder: "border-[#F3F300]/45 dark:border-[#F3F300]/55",
    cardHeaderBg: "bg-[#F3F300]/9 dark:bg-[#F3F300]/14",
    border: "border-l-[#F3F300]",
    softBg: "bg-[#F3F300]/14 dark:bg-[#F3F300]/18",
    rowBg: "bg-[#F3F300]/8 dark:bg-[#F3F300]/12",
    text: "text-[#A3A300] dark:text-[#F3F300]",
  },
] as const;

function pickClusterAccent(category: string) {
  const hash = [...category].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CLUSTER_ACCENTS[hash % CLUSTER_ACCENTS.length];
}

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [suggestions, setSuggestions] = useState<PrefixSuggestion[]>([]);
  const [prefixChoice, setPrefixChoice] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showToolCamera, setShowToolCamera] = useState(false);

  const [listQuery, setListQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterAvailability, setFilterAvailability] = useState<AvailabilityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("toolId");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ToolRow>>({});
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [locations, setLocations] = useState<ToolLocation[]>([]);

  // Location create form state
  const [newLocName, setNewLocName] = useState("");
  const [newLocType, setNewLocType] = useState<"estante" | "gaveta">("estante");
  const [newLocArea, setNewLocArea] = useState("");
  const [locCrudError, setLocCrudError] = useState<string | null>(null);
  const [locEditId, setLocEditId] = useState<number | null>(null);
  const [locEditDraft, setLocEditDraft] = useState<Partial<ToolLocation>>({});

  // Category edit state
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catEditName, setCatEditName] = useState("");
  const [catCrudError, setCatCrudError] = useState<string | null>(null);

  const applyScannedTool = useCallback((raw: string) => {
    setShowToolCamera(false);
    const code = normalizeScannedToolCode(raw);
    setForm((prev) => ({ ...prev, toolId: code }));
  }, []);

  async function loadTools() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tools", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar herramientas.");
      setTools(data as ToolRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando herramientas.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch("/api/admin/categories", { cache: "no-store" });
      if (res.ok) setCategories(await res.json() as ToolCategory[]);
    } catch { /* non-blocking */ }
  }

  async function loadLocations() {
    try {
      const res = await fetch("/api/admin/locations", { cache: "no-store" });
      if (res.ok) setLocations(await res.json() as ToolLocation[]);
    } catch { /* non-blocking */ }
  }

  useEffect(() => {
    void loadTools();
    void loadCategories();
    void loadLocations();
  }, []);

  useEffect(() => {
    if (!form.name.trim()) {
      setSuggestions([]);
      setPrefixChoice("");
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ suggestForName: form.name.trim() });
        const res = await fetch(`/api/admin/tools?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) return;
        const nextSuggestions = (data.suggestions ?? []) as PrefixSuggestion[];
        setSuggestions(nextSuggestions);
        setPrefixChoice((current) => current || nextSuggestions[0]?.prefix || "");
      } catch {
        // Non-blocking helper request.
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [form.name]);

  const categoryOptions = useMemo(() => {
    const set = new Set(tools.map((t) => t.category));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [tools]);

  const locationOptions = useMemo(() => {
    const set = new Set(tools.map((t) => t.location));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [tools]);

  const filteredSortedTools = useMemo(() => {
    let list = [...tools];
    const q = listQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.toolId.toLowerCase().includes(q) ||
          t.prefix.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q),
      );
    }
    if (filterCategory !== "all") {
      list = list.filter((t) => t.category === filterCategory);
    }
    if (filterLocation !== "all") {
      list = list.filter((t) => t.location === filterLocation);
    }
    if (filterAvailability === "available") {
      list = list.filter((t) => (t.inventory?.availableQuantity ?? 0) > 0);
    }
    if (filterAvailability === "unavailable") {
      list = list.filter((t) => (t.inventory?.availableQuantity ?? 0) === 0);
    }

    const dir = sortDir === "asc" ? 1 : -1;
    const avail = (t: ToolRow) => t.inventory?.availableQuantity ?? 0;
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name, "es");
          break;
        case "toolId":
          cmp = a.toolId.localeCompare(b.toolId);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category, "es") || a.toolId.localeCompare(b.toolId);
          break;
        case "location":
          cmp = a.location.localeCompare(b.location, "es") || a.toolId.localeCompare(b.toolId);
          break;
        case "availability":
          cmp = avail(a) - avail(b) || a.toolId.localeCompare(b.toolId);
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return list;
  }, [tools, listQuery, filterCategory, filterLocation, filterAvailability, sortKey, sortDir]);

  const groupedTools = useMemo(() => {
    return filteredSortedTools.reduce<Record<string, ToolRow[]>>((acc, tool) => {
      (acc[tool.category] ??= []).push(tool);
      return acc;
    }, {});
  }, [filteredSortedTools]);

  async function createNewTool(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        toolId: form.toolId.trim() || undefined,
        prefixChoice: form.toolId.trim() ? undefined : prefixChoice || undefined,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim(),
        condition: form.condition,
        location: form.location.trim(),
        requiresApproval: form.requiresApproval,
      };

      const res = await fetch("/api/admin/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions as PrefixSuggestion[]);
          setPrefixChoice((data.suggestions[0]?.prefix as string) ?? "");
        }
        throw new Error(data.error ?? "No se pudo crear la herramienta.");
      }

      setForm(INITIAL_FORM);
      setSuggestions([]);
      setPrefixChoice("");
      setMessage(`Herramienta creada: ${(data as ToolRow).toolId}`);
      await loadTools();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear herramienta.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(tool: ToolRow) {
    setEditingId(tool.id);
    setEditDraft({
      toolId: tool.toolId,
      name: tool.name,
      category: tool.category,
      location: tool.location,
      description: tool.description ?? "",
      condition: tool.condition,
      requiresApproval: tool.requiresApproval,
    });
  }

  function toggleCluster(clusterKey: string) {
    setExpandedClusters((prev) => ({
      ...prev,
      [clusterKey]: !Boolean(prev[clusterKey]),
    }));
  }

  // ─── Category CRUD ────────────────────────────────────────────────────────
  async function handleCreateCategory(name: string) {
    setCatCrudError(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) { setCatCrudError(data.error ?? "Error al crear categoría."); return; }
    await loadCategories();
  }

  async function handleDeleteCategory(id: number, name: string): Promise<boolean> {
    setCatCrudError(null);
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setCatCrudError(data.error ?? `No se pudo eliminar "${name}".`);
      return false;
    }
    await loadCategories();
    return true;
  }

  async function saveCatEdit(id: number) {
    if (!catEditName.trim()) return;
    setCatCrudError(null);
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catEditName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setCatCrudError(data.error ?? "Error al actualizar."); return; }
    setCatEditId(null);
    await loadCategories();
  }

  // ─── Location CRUD ────────────────────────────────────────────────────────
  async function handleCreateLocation(name: string) {
    setLocCrudError(null);
    // Guess type from name prefix
    const guessType = name.toLowerCase().startsWith("gaveta") ? "gaveta" : "estante";
    // Guess area: look for pattern like "A-1" and extract "Mueble A"
    const areaMatch = name.match(/([A-Z])-\d/i);
    const guessArea = areaMatch ? `Mueble ${areaMatch[1].toUpperCase()}` : "General";
    const res = await fetch("/api/admin/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, locationType: guessType, area: guessArea }),
    });
    const data = await res.json();
    if (!res.ok) { setLocCrudError(data.error ?? "Error al crear ubicación."); return; }
    await loadLocations();
  }

  async function handleDeleteLocation(id: number, name: string): Promise<boolean> {
    setLocCrudError(null);
    const res = await fetch(`/api/admin/locations/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setLocCrudError(data.error ?? `No se pudo eliminar "${name}".`);
      return false;
    }
    await loadLocations();
    return true;
  }

  async function saveLocEdit(id: number) {
    setLocCrudError(null);
    const res = await fetch(`/api/admin/locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(locEditDraft),
    });
    const data = await res.json();
    if (!res.ok) { setLocCrudError(data.error ?? "Error al actualizar."); return; }
    setLocEditId(null);
    await loadLocations();
  }

  async function submitNewLocation(e: FormEvent) {
    e.preventDefault();
    setLocCrudError(null);
    if (!newLocName.trim() || !newLocArea.trim()) { setLocCrudError("Nombre y mueble son obligatorios."); return; }
    const res = await fetch("/api/admin/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLocName.trim(), locationType: newLocType, area: newLocArea.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setLocCrudError(data.error ?? "Error al crear ubicación."); return; }
    setNewLocName(""); setNewLocArea("");
    await loadLocations();
  }

  async function saveEdit(toolId: number) {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo actualizar la herramienta.");
      }
      setMessage(`Herramienta actualizada: ${(data as ToolRow).toolId}`);
      setEditingId(null);
      setEditDraft({});
      await loadTools();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error actualizando herramienta.");
    }
  }

  async function deleteOneTool(tool: ToolRow) {
    const confirmed = window.confirm(`¿Eliminar ${tool.toolId} (${tool.name})?`);
    if (!confirmed) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tools/${tool.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo eliminar la herramienta.");
      }
      setMessage(`Herramienta eliminada: ${tool.toolId}`);
      await loadTools();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando herramienta.");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Herramientas</h1>
        <p className="text-muted-foreground text-sm">
          Registro por escaneo/código, inventario unitario y configuración de aprobación.
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

      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={() => setIsCreateFormOpen((prev) => !prev)}
            className="flex min-h-8 w-full items-center text-left"
            aria-expanded={isCreateFormOpen}
            aria-label={`${isCreateFormOpen ? "Contraer" : "Expandir"} formulario de registro`}
          >
            <CardTitle className="flex items-center gap-2 text-base leading-none">
              {isCreateFormOpen ? (
                <ChevronDown className="size-4 text-emerald-600" />
              ) : (
                <ChevronRight className="size-4 text-emerald-600" />
              )}
              <PlusCircle className="size-4 text-emerald-600" />
              Registrar herramienta
            </CardTitle>
          </button>
        </CardHeader>
        {isCreateFormOpen && (
        <CardContent>
          {showToolCamera && (
            <QRCameraModal
              title="Escanear código de herramienta"
              onClose={() => setShowToolCamera(false)}
              onScan={applyScannedTool}
            />
          )}
          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={createNewTool}>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="toolId">Código escaneado (opcional)</Label>
              <p className="text-xs text-muted-foreground">
                Escribe el código (ej. <span className="font-mono">MAR_001</span>) o escanéalo con la cámara, igual
                que en el kiosco. Si lo dejas vacío, generamos automáticamente{" "}
                <span className="font-mono">PREFIX_NNN</span>.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:max-w-xl">
                <Input
                  id="toolId"
                  value={form.toolId}
                  onChange={(e) => setForm((prev) => ({ ...prev, toolId: e.target.value.toUpperCase() }))}
                  placeholder="MAR_001"
                  className="font-mono sm:flex-1"
                  autoComplete="off"
                />
                <Button type="button" variant="secondary" className="shrink-0" onClick={() => setShowToolCamera(true)}>
                  <Camera className="size-4" />
                  Escanear QR
                </Button>
              </div>
            </div>

            {!form.toolId.trim() && (
              <div className="space-y-1 md:col-span-2">
                <Label>Prefijo sugerido</Label>
                <Select value={prefixChoice} onValueChange={setPrefixChoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona prefijo" />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestions.map((s) => (
                      <SelectItem key={s.prefix} value={s.prefix}>
                        {s.prefix} ({s.nextToolId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Categoría</Label>
              <CatalogCombobox
                value={form.category}
                onChange={(v) => setForm((prev) => ({ ...prev, category: v }))}
                items={categories}
                placeholder="Selecciona o escribe categoría…"
                onCreateItem={handleCreateCategory}
                onDeleteItem={handleDeleteCategory}
                createLabel="Crear categoría"
              />
            </div>

            <div className="space-y-1">
              <Label>Estante / Ubicación</Label>
              <CatalogCombobox
                value={form.location}
                onChange={(v) => setForm((prev) => ({ ...prev, location: v }))}
                items={locations}
                placeholder="Selecciona o escribe ubicación…"
                onCreateItem={handleCreateLocation}
                onDeleteItem={handleDeleteLocation}
                createLabel="Crear ubicación"
              />
            </div>

            <div className="space-y-1">
              <Label>Condición</Label>
              <Select
                value={form.condition}
                onValueChange={(value) => setForm((prev) => ({ ...prev, condition: value as ToolCondition }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excelente</SelectItem>
                  <SelectItem value="good">Bueno</SelectItem>
                  <SelectItem value="fair">Regular</SelectItem>
                  <SelectItem value="poor">Malo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
              />
            </div>

            <div
              role="checkbox"
              aria-checked={form.requiresApproval}
              tabIndex={0}
              onClick={() => setForm((prev) => ({ ...prev, requiresApproval: !prev.requiresApproval }))}
              onKeyDown={(e) => e.key === "Enter" && setForm((prev) => ({ ...prev, requiresApproval: !prev.requiresApproval }))}
              className={cn(
                "md:col-span-2 rounded-lg border-2 p-4 cursor-pointer transition-all select-none outline-none",
                form.requiresApproval
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-600"
                  : "border-border bg-muted/20 hover:border-blue-200 dark:hover:border-blue-800 focus-visible:border-blue-300"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 shrink-0 rounded-full p-1.5 transition-colors", form.requiresApproval ? "bg-blue-500" : "bg-muted")}>
                  <Info className={cn("size-4", form.requiresApproval ? "text-white" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-semibold text-sm", form.requiresApproval ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>
                    Requiere aprobación del encargado
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    El préstamo debe ser aprobado por un encargado o administrador antes de entregarse al estudiante.
                  </p>
                </div>
                <div className={cn(
                  "shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  form.requiresApproval ? "border-blue-500 bg-blue-500" : "border-muted-foreground"
                )}>
                  {form.requiresApproval && <Check className="size-3 text-white" />}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                <PlusCircle className="size-4" />
                {submitting ? "Guardando..." : "Registrar herramienta"}
              </Button>
            </div>
          </form>
        </CardContent>
        )}
      </Card>

      {!loading && tools.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="size-4 text-emerald-600" />
              Filtros y orden
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-1 xl:col-span-2">
              <Label htmlFor="tool-list-search" className="text-xs">
                Buscar
              </Label>
              <Input
                id="tool-list-search"
                placeholder="Nombre, código, categoría, ubicación…"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoría</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ubicación</Label>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {locationOptions.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Disponibilidad</Label>
              <Select
                value={filterAvailability}
                onValueChange={(v) => setFilterAvailability(v as AvailabilityFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="available">Con unidad disponible</SelectItem>
                  <SelectItem value="unavailable">No disponibles (0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-1 xl:col-span-1">
              <Label className="text-xs">Ordenar por</Label>
              <div className="flex gap-2">
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toolId">Código / ID</SelectItem>
                    <SelectItem value="name">Nombre</SelectItem>
                    <SelectItem value="category">Categoría</SelectItem>
                    <SelectItem value="location">Ubicación</SelectItem>
                    <SelectItem value="availability">Disponibles</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortDir} onValueChange={(v) => setSortDir(v as SortDir)}>
                  <SelectTrigger className="w-[110px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascendente</SelectItem>
                    <SelectItem value="desc">Descendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && tools.length > 0 && filteredSortedTools.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Ninguna herramienta coincide con los filtros. Ajusta la búsqueda o restablece disponibilidad / categoría.
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Cargando herramientas...</CardContent>
        </Card>
      ) : (
        Object.entries(groupedTools)
          .sort(([a], [b]) => a.localeCompare(b, "es"))
          .map(([category, categoryTools]) => {
            const clusters = clusterToolsByPrefix(categoryTools);
            const accent = pickClusterAccent(category);
            return (
          <Card key={category} className={accent.cardBorder}>
            <CardHeader className={`pb-3 ${accent.cardHeaderBg}`}>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className={`size-4 ${accent.text}`} />
                {category}
                <Badge variant="inventory">{categoryTools.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">ID</th>
                      <th className="text-left py-2 pr-4 font-medium">Nombre</th>
                      <th className="text-left py-2 pr-4 font-medium">Ubicación</th>
                      <th className="text-left py-2 pr-4 font-medium">Condición</th>
                      <th className="text-left py-2 pr-4 font-medium">Aprobación</th>
                      <th className="text-left py-2 pr-4 font-medium">Disponibles</th>
                      <th className="text-left py-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusters.flatMap((cluster) => {
                      const multi = cluster.items.length > 1;
                      const clusterKey = `${category}::${cluster.prefix}`;
                      const isExpanded = !multi || Boolean(expandedClusters[clusterKey]);
                      const firstToolId = cluster.items[0]?.toolId ?? "";
                      const lastToolId = cluster.items[cluster.items.length - 1]?.toolId ?? "";
                      const idRange =
                        firstToolId && lastToolId && firstToolId !== lastToolId
                          ? `${firstToolId} .. ${lastToolId}`
                          : firstToolId;
                      const headerRow = multi ? (
                        <tr
                          key={`hdr-${clusterKey}`}
                          className={`border-b ${accent.softBg}`}
                        >
                          <td colSpan={7} className={`py-3 px-4 border-l-4 ${accent.border}`}>
                            <button
                              type="button"
                              onClick={() => toggleCluster(clusterKey)}
                              className="w-full text-left"
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? "Contraer" : "Expandir"} cluster ${cluster.prefix}`}
                            >
                              <div className="flex flex-wrap items-center gap-2.5 text-sm">
                                {isExpanded ? (
                                  <ChevronDown className={`size-4 ${accent.text}`} />
                                ) : (
                                  <ChevronRight className={`size-4 ${accent.text}`} />
                                )}
                                <Badge variant="inventory" className="font-mono">
                                  {cluster.prefix}
                                </Badge>
                                <span className="font-semibold text-foreground">{cluster.items[0]?.name}</span>
                                <span className="text-muted-foreground text-xs">{cluster.items.length} unidades</span>
                                <span className="font-mono text-xs text-muted-foreground">{idRange}</span>
                              </div>
                            </button>
                          </td>
                        </tr>
                      ) : null;

                      const dataRows = isExpanded ? cluster.items.map((tool) => {
                      const isEditing = editingId === tool.id;
                      const current = isEditing ? { ...tool, ...editDraft } : tool;
                      const avail = tool.inventory?.availableQuantity ?? 0;
                      return (
                        <tr
                          key={tool.id}
                          className={
                            (multi ? `border-l-4 ${accent.border} ${accent.rowBg} ` : "") +
                            "border-b last:border-0 hover:bg-muted/40"
                          }
                        >
                          <td className={`py-2.5 pr-4 font-mono text-xs ${multi ? "pl-4" : "text-muted-foreground"}`}>
                            {isEditing ? (
                              <Input
                                value={(current.toolId as string) ?? ""}
                                onChange={(e) => setEditDraft((prev) => ({ ...prev, toolId: e.target.value.toUpperCase() }))}
                                className="h-8 font-mono"
                              />
                            ) : (
                              tool.toolId
                            )}
                          </td>
                          <td className="py-2.5 pr-4 font-medium">
                            {isEditing ? (
                              <Input
                                value={(current.name as string) ?? ""}
                                onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                                className="h-8"
                              />
                            ) : multi ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : (
                              tool.name
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {isEditing ? (
                              <Input
                                value={(current.location as string) ?? ""}
                                onChange={(e) => setEditDraft((prev) => ({ ...prev, location: e.target.value }))}
                                className="h-8"
                              />
                            ) : multi ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : (
                              tool.location
                            )}
                          </td>
                          <td className="py-2.5 pr-4">
                            {isEditing ? (
                              <Select
                                value={(current.condition as ToolCondition) ?? "good"}
                                onValueChange={(value) =>
                                  setEditDraft((prev) => ({ ...prev, condition: value as ToolCondition }))
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="excellent">Excelente</SelectItem>
                                  <SelectItem value="good">Bueno</SelectItem>
                                  <SelectItem value="fair">Regular</SelectItem>
                                  <SelectItem value="poor">Malo</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={CONDITION_VARIANT[tool.condition]}>
                                {CONDITION_LABEL[tool.condition]}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 pr-4">
                            {isEditing ? (
                              <label className="inline-flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={Boolean(current.requiresApproval)}
                                  onChange={(e) =>
                                    setEditDraft((prev) => ({
                                      ...prev,
                                      requiresApproval: e.target.checked,
                                    }))
                                  }
                                />
                                Requiere
                              </label>
                            ) : multi ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : tool.requiresApproval ? (
                              <Badge variant="admin">Sí</Badge>
                            ) : (
                              <Badge variant="secondary">No</Badge>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-center">
                            <span
                              className={
                                avail === 0
                                  ? "font-semibold text-purple-700 dark:text-purple-300"
                                  : ""
                              }
                            >
                              {tool.inventory?.availableQuantity ?? 0} / {tool.inventory?.totalQuantity ?? 1}
                            </span>
                            {avail === 0 && (
                              <Badge variant="alert" className="ml-2 align-middle text-[10px]">
                                No disp.
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <Button size="sm" onClick={() => void saveEdit(tool.id)}>
                                    <Save className="size-4" />
                                    Guardar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditDraft({});
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => startEdit(tool)}>
                                    Editar
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => void deleteOneTool(tool)}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                      }) : [];
                      return multi && headerRow ? [headerRow, ...dataRows] : dataRows;
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
            );
          })
      )}

      {/* ─── Category CRUD ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="size-4 text-[#9746FF]" />
            Categorías de herramientas
            <Badge variant="inventory">{categories.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {catCrudError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{catCrudError}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Nombre</th>
                  <th className="text-left py-2 pr-4 font-medium">Herramientas</th>
                  <th className="text-left py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4 font-medium">
                      {catEditId === cat.id ? (
                        <Input value={catEditName} onChange={(e) => setCatEditName(e.target.value)} className="h-7 text-sm" autoFocus />
                      ) : cat.name}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground text-xs">
                      {tools.filter((t) => t.category === cat.name).length} herramienta(s)
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {catEditId === cat.id ? (
                          <>
                            <Button size="sm" onClick={() => void saveCatEdit(cat.id)}><Save className="size-3.5" /> Guardar</Button>
                            <Button size="sm" variant="outline" onClick={() => setCatEditId(null)}>Cancelar</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => { setCatEditId(cat.id); setCatEditName(cat.name); }}>Editar</Button>
                            <Button size="sm" variant="destructive" onClick={() => void handleDeleteCategory(cat.id, cat.name)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-sm">Sin categorías. Crea la primera abajo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <form
            className="flex gap-2 items-end pt-1 border-t"
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("newCatName") as HTMLInputElement);
              void handleCreateCategory(input.value.trim()).then(() => { input.value = ""; });
            }}
          >
            <div className="flex-1 space-y-1">
              <Label htmlFor="newCatName" className="text-xs">Nueva categoría</Label>
              <Input id="newCatName" placeholder="ej. Medición" className="h-8" required />
            </div>
            <Button type="submit" size="sm" className="shrink-0"><Plus className="size-3.5" /> Agregar</Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── Location CRUD ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="size-4 text-[#006FFF]" />
            Ubicaciones del laboratorio
            <Badge variant="inventory">{locations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {locCrudError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{locCrudError}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Nombre</th>
                  <th className="text-left py-2 pr-4 font-medium">Tipo</th>
                  <th className="text-left py-2 pr-4 font-medium">Mueble</th>
                  <th className="text-left py-2 pr-4 font-medium w-24">Herramientas</th>
                  <th className="text-left py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4 font-mono text-xs font-medium">
                      {locEditId === loc.id ? (
                        <Input value={locEditDraft.name ?? loc.name} onChange={(e) => setLocEditDraft((p) => ({ ...p, name: e.target.value }))} className="h-7 text-xs font-mono" />
                      ) : loc.name}
                    </td>
                    <td className="py-2 pr-4">
                      {locEditId === loc.id ? (
                        <Select value={locEditDraft.locationType ?? loc.locationType} onValueChange={(v) => setLocEditDraft((p) => ({ ...p, locationType: v }))}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="estante">Estante</SelectItem>
                            <SelectItem value="gaveta">Gaveta</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] capitalize">{loc.locationType}</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground text-xs">
                      {locEditId === loc.id ? (
                        <Input value={locEditDraft.area ?? loc.area} onChange={(e) => setLocEditDraft((p) => ({ ...p, area: e.target.value }))} className="h-7 text-xs" placeholder="Mueble A" />
                      ) : loc.area}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground text-xs">
                      {tools.filter((t) => t.location === loc.name).length}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {locEditId === loc.id ? (
                          <>
                            <Button size="sm" onClick={() => void saveLocEdit(loc.id)}><Save className="size-3.5" /> Guardar</Button>
                            <Button size="sm" variant="outline" onClick={() => setLocEditId(null)}>Cancelar</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => { setLocEditId(loc.id); setLocEditDraft({ name: loc.name, locationType: loc.locationType, area: loc.area }); }}>Editar</Button>
                            <Button size="sm" variant="destructive" onClick={() => void handleDeleteLocation(loc.id, loc.name)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {locations.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-sm">Sin ubicaciones registradas. Agrega la primera abajo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <form onSubmit={(e) => void submitNewLocation(e)} className="grid grid-cols-1 gap-2 sm:grid-cols-4 items-end pt-1 border-t">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Nombre de ubicación</Label>
              <Input placeholder="ej. Estante A-3" value={newLocName} onChange={(e) => setNewLocName(e.target.value)} className="h-8" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={newLocType} onValueChange={(v) => setNewLocType(v as "estante" | "gaveta")}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="estante">Estante</SelectItem>
                  <SelectItem value="gaveta">Gaveta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mueble (área)</Label>
              <Input placeholder="ej. Mueble A" value={newLocArea} onChange={(e) => setNewLocArea(e.target.value)} className="h-8" required />
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" size="sm"><Plus className="size-3.5" /> Agregar ubicación</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
