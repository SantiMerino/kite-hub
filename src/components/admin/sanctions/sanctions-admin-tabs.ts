import { AlertTriangle, History, type LucideIcon } from "lucide-react";

export type SanctionsAdminTabId = "activas" | "historial";

/** Tabs de sanciones (admin); sincronizar con `SanctionsAdminPage` y query `tab`. */
export const SANCTIONS_ADMIN_TABS: ReadonlyArray<{
  id: SanctionsAdminTabId;
  label: string;
  icon: LucideIcon;
  triggerClass: string;
  countClass: string;
}> = [
  {
    id: "activas",
    label: "Activas",
    icon: AlertTriangle,
    triggerClass:
      "text-purple-800/95 dark:text-purple-200/95 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-950 dark:data-[state=active]:bg-purple-950/40 dark:data-[state=active]:text-purple-50 data-[state=active]:border-purple-200/70 dark:data-[state=active]:border-purple-800/45",
    countClass:
      "bg-purple-500/15 text-purple-950 dark:bg-purple-400/12 dark:text-purple-50 group-data-[state=active]:bg-purple-500/25 dark:group-data-[state=active]:bg-purple-400/20",
  },
  {
    id: "historial",
    label: "Historial",
    icon: History,
    triggerClass:
      "text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:border-border",
    countClass:
      "bg-muted text-muted-foreground group-data-[state=active]:bg-background group-data-[state=active]:text-foreground",
  },
];

const TAB_IDS = new Set<string>(SANCTIONS_ADMIN_TABS.map((t) => t.id));

export function parseSanctionsAdminTabParam(value: string | null): SanctionsAdminTabId {
  if (value && TAB_IDS.has(value)) return value as SanctionsAdminTabId;
  return "activas";
}
