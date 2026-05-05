import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  PackageOpen,
  Wrench,
  Users,
  AlertTriangle,
  ScrollText,
  UserCircle2,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Shared active / inactive styles: sidebar and mobile dock stay visually aligned. */
export const NAV_LINK_ACTIVE =
  "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border";
export const NAV_LINK_INACTIVE =
  "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground";
export const NAV_ICON_INACTIVE = "text-muted-foreground";

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Panel", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Préstamos", href: "/admin/loans", icon: PackageOpen },
  { label: "Herramientas", href: "/admin/tools", icon: Wrench },
  { label: "Estudiantes", href: "/admin/students", icon: Users },
  { label: "Sanciones", href: "/admin/sanctions", icon: AlertTriangle },
  { label: "Bitácora", href: "/admin/audit", icon: ScrollText },
  { label: "Perfil", href: "/admin/profile", icon: UserCircle2 },
];
