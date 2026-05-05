"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { UnifiedNotificationItem } from "@/types/admin-notifications";

type NotificationBellProps = {
  initialUnreadCount: number;
};

export default function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UnifiedNotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as UnifiedNotificationItem[];
      setItems(data);
      setUnreadCount(data.filter((i) => !i.read).length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const markRead = async (item: UnifiedNotificationItem) => {
    if (item.read) return;
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind: item.kind, id: item.id }),
      });
      setItems((prev) =>
        prev?.map((i) =>
          i.kind === item.kind && i.id === item.id ? { ...i, read: true } : i,
        ) ?? null,
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const onItemActivate = async (item: UnifiedNotificationItem) => {
    await markRead(item);
    if (item.kind === "staff" && item.linkHref) {
      setOpen(false);
      router.push(item.linkHref);
    }
  };

  const formatWhen = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("es", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full p-0 px-1 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle>Notificaciones</DialogTitle>
          <DialogDescription className="text-xs">
            Alertas del laboratorio y correos enviados a tu cuenta.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(70vh,420px)] overflow-y-auto px-2 py-2">
          {loading && items === null ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" aria-hidden />
            </div>
          ) : !items?.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No hay notificaciones.</p>
          ) : (
            <ul className="space-y-1">
              {items.map((item) => {
                const Icon = item.kind === "email" ? Mail : Bell;
                const interactive = item.kind === "staff" && item.linkHref;
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => void onItemActivate(item)}
                      className={cn(
                        "flex w-full gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        !item.read && "bg-muted/40",
                        interactive && "cursor-pointer",
                        item.kind === "email" && "cursor-default",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card",
                          item.kind === "email" && "text-foreground",
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "line-clamp-2 font-medium leading-snug",
                              !item.read && "text-foreground",
                            )}
                          >
                            {item.title}
                          </span>
                          {!item.read && (
                            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {item.body}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                          <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
                          {item.kind === "email" && (
                            <span className="truncate">→ {item.toEmail}</span>
                          )}
                          {interactive && (
                            <span className="text-primary">Abrir enlace</span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
