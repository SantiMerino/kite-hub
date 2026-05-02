import { LayoutGrid, MapPin, Tag } from "lucide-react";

/** Tabs de administración de inventario; añade entradas aquí para nuevas secciones. */
export const TOOLS_ADMIN_TABS = [
  {
    id: "herramientas",
    label: "Herramientas",
    description: "Alta, listado, filtros e inventario",
    icon: LayoutGrid,
  },
  {
    id: "espacios",
    label: "Espacios",
    description: "Ubicaciones del laboratorio (estantes, gavetas, muebles)",
    icon: MapPin,
  },
  {
    id: "categorias",
    label: "Categorías",
    description: "Tipos de herramienta para el catálogo",
    icon: Tag,
  },
] as const;

export type ToolsAdminTabId = (typeof TOOLS_ADMIN_TABS)[number]["id"];

export type ToolsAdminTabMeta = (typeof TOOLS_ADMIN_TABS)[number];

const TAB_IDS = new Set<string>(TOOLS_ADMIN_TABS.map((t) => t.id));

export function parseToolsAdminTabParam(value: string | null): ToolsAdminTabId {
  if (value && TAB_IDS.has(value)) return value as ToolsAdminTabId;
  return "herramientas";
}
