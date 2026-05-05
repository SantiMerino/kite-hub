import {
  AlertTriangle,
  Ban,
  Clock,
  PlayCircle,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

export type LoansAdminTabId =
  | "pendientes"
  | "vencidos"
  | "activos"
  | "denegados"
  | "devoluciones";

/** Tabs de préstamos (admin); sincronizar con `LoansAdminPage` y query `tab`. */
export const LOANS_ADMIN_TABS: ReadonlyArray<{
  id: LoansAdminTabId;
  label: string;
  icon: LucideIcon;
  /** Clases extra para `TabsTrigger`: acento en reposo y estado activo (light + dark). */
  triggerClass: string;
  /** Clases para la pastilla del contador junto al label. */
  countClass: string;
}> = [
  {
    id: "pendientes",
    label: "Pendientes",
    icon: Clock,
    triggerClass:
      "text-amber-800/95 dark:text-amber-200/95 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-950 dark:data-[state=active]:bg-amber-950/40 dark:data-[state=active]:text-amber-50 data-[state=active]:border-amber-200/70 dark:data-[state=active]:border-amber-800/45",
    countClass:
      "bg-amber-500/15 text-amber-950 dark:bg-amber-400/12 dark:text-amber-50 group-data-[state=active]:bg-amber-500/25 dark:group-data-[state=active]:bg-amber-400/20",
  },
  {
    id: "vencidos",
    label: "Vencidos",
    icon: AlertTriangle,
    triggerClass:
      "text-red-800/95 dark:text-red-200/95 data-[state=active]:bg-red-50 data-[state=active]:text-red-950 dark:data-[state=active]:bg-red-950/40 dark:data-[state=active]:text-red-50 data-[state=active]:border-red-200/70 dark:data-[state=active]:border-red-800/45",
    countClass:
      "bg-red-500/15 text-red-950 dark:bg-red-400/12 dark:text-red-50 group-data-[state=active]:bg-red-500/25 dark:group-data-[state=active]:bg-red-400/20",
  },
  {
    id: "activos",
    label: "Activos",
    icon: PlayCircle,
    triggerClass:
      "text-emerald-800/95 dark:text-emerald-200/95 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-950 dark:data-[state=active]:bg-emerald-950/40 dark:data-[state=active]:text-emerald-50 data-[state=active]:border-emerald-200/70 dark:data-[state=active]:border-emerald-800/45",
    countClass:
      "bg-emerald-500/15 text-emerald-950 dark:bg-emerald-400/12 dark:text-emerald-50 group-data-[state=active]:bg-emerald-500/25 dark:group-data-[state=active]:bg-emerald-400/20",
  },
  {
    id: "denegados",
    label: "Denegados",
    icon: Ban,
    triggerClass:
      "text-purple-800/95 dark:text-purple-200/95 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-950 dark:data-[state=active]:bg-purple-950/40 dark:data-[state=active]:text-purple-50 data-[state=active]:border-purple-200/70 dark:data-[state=active]:border-purple-800/45",
    countClass:
      "bg-purple-500/15 text-purple-950 dark:bg-purple-400/12 dark:text-purple-50 group-data-[state=active]:bg-purple-500/25 dark:group-data-[state=active]:bg-purple-400/20",
  },
  {
    id: "devoluciones",
    label: "Devoluciones",
    icon: RotateCcw,
    triggerClass:
      "text-blue-800/95 dark:text-blue-200/95 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-950 dark:data-[state=active]:bg-blue-950/40 dark:data-[state=active]:text-blue-50 data-[state=active]:border-blue-200/70 dark:data-[state=active]:border-blue-800/45",
    countClass:
      "bg-blue-500/15 text-blue-950 dark:bg-blue-400/12 dark:text-blue-50 group-data-[state=active]:bg-blue-500/25 dark:group-data-[state=active]:bg-blue-400/20",
  },
];

const TAB_IDS = new Set<string>(LOANS_ADMIN_TABS.map((t) => t.id));

export function parseLoansAdminTabParam(value: string | null): LoansAdminTabId {
  if (value && TAB_IDS.has(value)) return value as LoansAdminTabId;
  return "pendientes";
}
