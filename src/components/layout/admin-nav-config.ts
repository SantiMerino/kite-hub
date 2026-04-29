import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  PackageOpen,
  Wrench,
  Users,
  AlertTriangle,
  ScrollText,
  BarChart3,
  UserCircle2,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Inactive row: icon tint (avoid blue text on dark for contrast). */
  color: string;
  activeColor: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "Panel",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    color: "text-violet-600 dark:text-violet-400",
    activeColor:
      "bg-violet-50 text-violet-800 dark:bg-violet-500/20 dark:text-foreground",
  },
  {
    label: "Préstamos",
    href: "/admin/loans",
    icon: PackageOpen,
    color: "text-blue-600 dark:text-muted-foreground",
    activeColor:
      "bg-blue-50 text-blue-800 dark:bg-muted dark:text-foreground",
  },
  {
    label: "Herramientas",
    href: "/admin/tools",
    icon: Wrench,
    color: "text-emerald-600 dark:text-emerald-400",
    activeColor:
      "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-foreground",
  },
  {
    label: "Estudiantes",
    href: "/admin/students",
    icon: Users,
    color: "text-blue-600 dark:text-muted-foreground",
    activeColor:
      "bg-blue-50 text-blue-800 dark:bg-muted dark:text-foreground",
  },
  {
    label: "Sanciones",
    href: "/admin/sanctions",
    icon: AlertTriangle,
    color: "text-purple-600 dark:text-purple-400",
    activeColor:
      "bg-purple-50 text-purple-800 dark:bg-purple-500/20 dark:text-foreground",
  },
  {
    label: "Bitácora",
    href: "/admin/audit",
    icon: ScrollText,
    color: "text-violet-600 dark:text-violet-400",
    activeColor:
      "bg-violet-50 text-violet-800 dark:bg-violet-500/20 dark:text-foreground",
  },
  {
    label: "Perfil",
    href: "/admin/profile",
    icon: UserCircle2,
    color: "text-violet-600 dark:text-violet-400",
    activeColor:
      "bg-violet-50 text-violet-800 dark:bg-violet-500/20 dark:text-foreground",
  },
  {
    label: "Métricas",
    href: "/admin/metrics",
    icon: BarChart3,
    color: "text-emerald-600 dark:text-emerald-400",
    activeColor:
      "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-foreground",
  },
];
