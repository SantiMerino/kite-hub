import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/theme/theme-toggle";
import NotificationBell from "@/components/layout/NotificationBell";
import {
  isDevAuthBypassEnabled,
  withDevDatabaseFallback,
} from "@/lib/dev-bypass";
import { countUnreadNotifications } from "@/services/notification.service";

const HAS_DATABASE_URL = Boolean(process.env.DATABASE_URL);

export default async function TopBar({ title }: { title?: string }) {
  const user = await getAuthUser();

  const unreadCount = user
    ? isDevAuthBypassEnabled()
      ? await withDevDatabaseFallback(
          () => countUnreadNotifications(user.id),
          0,
        )
      : HAS_DATABASE_URL
        ? await countUnreadNotifications(user.id)
        : 0
    : 0;

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    staff: "Encargado",
    student: "Estudiante",
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between gap-2 px-4 sm:px-6 shrink-0 min-w-0">
      <div className="min-w-0">
        {title && (
          <h1 className="text-sm font-semibold truncate">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <ThemeToggle />

        {user && <NotificationBell initialUnreadCount={unreadCount} />}

        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium">{user.name ?? user.email ?? "Usuario"}</span>
              <Badge variant="admin" className="h-4 text-[10px]">
                {roleLabel[user.role] ?? user.role}
              </Badge>
            </div>
            <Link href="/admin/profile" className="size-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
              <User className="size-4 text-violet-700 dark:text-violet-300" />
            </Link>
          </div>
        )}

        <form action="/api/auth/admin/logout" method="POST">
          <Button variant="ghost" size="icon" type="submit">
            <LogOut className="size-4" />
            <span className="sr-only">Cerrar sesión</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
