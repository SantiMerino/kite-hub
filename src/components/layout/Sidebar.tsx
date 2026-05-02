"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS } from "@/components/layout/admin-nav-config";

const scrollHide =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden lg:flex h-full min-h-0 flex-col w-60 shrink-0 self-stretch border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border">
          <FlaskConical className="size-5 text-violet-600 dark:text-violet-400" />
          <span className="font-semibold text-sm tracking-tight">Kite Hub</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {ADMIN_NAV_ITEMS.map((item) => {
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
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "" : item.color)} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground">Laboratorio © 2025</p>
        </div>
      </aside>

      {/* Mobile: glass dock — horizontal scroll for 9 items */}
      <nav
        aria-label="Navegación principal"
        className={cn(
          "lg:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none",
          "pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        )}
      >
        <div className="pointer-events-auto px-3 pb-1">
          <div
            className={cn(
              "mx-auto max-w-2xl rounded-2xl border shadow-lg",
              "border-white/20 bg-background/80 backdrop-blur-xl",
              "dark:border-white/10 dark:bg-card/60 dark:backdrop-blur-xl",
              "flex overflow-x-auto snap-x snap-mandatory gap-0.5 px-2 py-2",
              scrollHide
            )}
          >
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-w-17 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium leading-tight transition-colors",
                    active
                      ? item.activeColor
                      : "text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className={cn("size-5 shrink-0", active ? "" : item.color)} />
                  <span className="max-w-18 truncate text-center">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
