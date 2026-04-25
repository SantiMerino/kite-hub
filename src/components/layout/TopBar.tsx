import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { getAuthUser } from "@/lib/auth";
import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import {
  isDevAuthBypassEnabled,
  withDevDatabaseFallback,
} from "@/lib/dev-bypass";

const HAS_DATABASE_URL = Boolean(process.env.DATABASE_URL);

export default async function TopBar({ title }: { title?: string }) {
  const session = await auth0.getSession();
  const user = session ? await getAuthUser() : null;

  const unreadCount = user
    ? isDevAuthBypassEnabled()
      ? await withDevDatabaseFallback(
          () =>
            prisma.staffNotification.count({
              where: { userId: user.id, status: "unread" },
            }),
          0,
        )
      : HAS_DATABASE_URL
        ? await prisma.staffNotification.count({
            where: { userId: user.id, status: "unread" },
          })
        : 0
    : 0;

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    staff: "Encargado",
    student: "Estudiante",
  };

  return (
    <header className="h-14 border-b border-border bg-white flex items-center justify-between px-6 shrink-0">
      <div>
        {title && <h1 className="text-sm font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications bell */}
        <Link href="/admin/audit" className="relative">
          <Button variant="ghost" size="icon">
            <Bell className="size-4" />
          </Button>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full text-[10px] p-0 px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Link>

        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium">{user.name ?? user.email ?? "Usuario"}</span>
              <Badge variant="admin" className="h-4 text-[10px]">
                {roleLabel[user.role] ?? user.role}
              </Badge>
            </div>
            <div className="size-8 rounded-full bg-violet-100 flex items-center justify-center">
              <User className="size-4 text-violet-600" />
            </div>
          </div>
        )}

        <Link href="/api/auth/logout">
          <Button variant="ghost" size="icon">
            <LogOut className="size-4" />
          </Button>
        </Link>
      </div>
    </header>
  );
}
