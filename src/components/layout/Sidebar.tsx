"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackageOpen,
  Wrench,
  Users,
  AlertTriangle,
  ScrollText,
  BarChart3,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Panel",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    color: "text-violet-600",
    activeColor: "bg-violet-50 text-violet-700",
  },
  {
    label: "Préstamos",
    href: "/admin/loans",
    icon: PackageOpen,
    color: "text-blue-600",
    activeColor: "bg-blue-50 text-blue-700",
  },
  {
    label: "Herramientas",
    href: "/admin/tools",
    icon: Wrench,
    color: "text-emerald-600",
    activeColor: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Estudiantes",
    href: "/admin/students",
    icon: Users,
    color: "text-blue-600",
    activeColor: "bg-blue-50 text-blue-700",
  },
  {
    label: "Sanciones",
    href: "/admin/sanctions",
    icon: AlertTriangle,
    color: "text-purple-600",
    activeColor: "bg-purple-50 text-purple-700",
  },
  {
    label: "Bitácora",
    href: "/admin/audit",
    icon: ScrollText,
    color: "text-violet-600",
    activeColor: "bg-violet-50 text-violet-700",
  },
  {
    label: "Métricas",
    href: "/admin/metrics",
    icon: BarChart3,
    color: "text-emerald-600",
    activeColor: "bg-emerald-50 text-emerald-700",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-white min-h-screen shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border">
        <FlaskConical className="size-5 text-violet-600" />
        <span className="font-semibold text-sm tracking-tight">Kite Hub</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? item.activeColor
                  : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "" : item.color)} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <p className="text-[11px] text-muted-foreground">Laboratorio © 2025</p>
      </div>
    </aside>
  );
}
