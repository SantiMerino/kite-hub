"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ADMIN_NAV_ITEMS,
  NAV_ICON_INACTIVE,
  NAV_LINK_ACTIVE,
  NAV_LINK_INACTIVE,
} from "@/components/layout/admin-nav-config";

const scrollHide =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden lg:flex h-full min-h-0 flex-col w-60 shrink-0 self-stretch border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2.5 px-5 h-14 border-b border-border transition-colors hover:bg-sidebar-accent/50"
        >
          <Image
            src="/icon.png"
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 object-contain"
            priority
          />
          <span className="font-semibold text-sm tracking-tight">KITEHUB</span>
        </Link>

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
                  active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE,
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-sidebar-accent-foreground" : NAV_ICON_INACTIVE,
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground">Laboratorio © 2026</p>
        </div>
      </aside>

      <nav
        aria-label="Navegación principal"
        className={cn(
          "lg:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none",
          "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="pointer-events-auto px-3 pb-1">
          <div
            className={cn(
              "mx-auto max-w-2xl overflow-x-auto snap-x snap-mandatory rounded-2xl border shadow-lg",
              "border-border/80 bg-sidebar/90 backdrop-blur-xl",
              "dark:border-sidebar-border dark:bg-sidebar/80 dark:backdrop-blur-xl",
              scrollHide,
            )}
          >
            <div className="flex w-max min-w-full justify-center gap-0.5 px-2 py-2">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-w-17 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium leading-tight transition-colors",
                      active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE,
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5 shrink-0",
                        active ? "text-sidebar-accent-foreground" : NAV_ICON_INACTIVE,
                      )}
                    />
                    <span className="max-w-18 truncate text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
