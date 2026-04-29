import Link from "next/link";
import { ShieldAlert, UserCircle2 } from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export default async function ProfileAdminPage() {
  const actor = await getAuthUser();

  if (!actor) return null;

  const [activeSanctions, activeLoans, recentAudit] = await Promise.all([
    prisma.sanction.count({
      where: { studentId: actor.id, status: "active" },
    }),
    prisma.loan.count({
      where: { studentId: actor.id, status: { in: ["active", "overdue"] } },
    }),
    prisma.auditLog.findMany({
      where: { userId: actor.id },
      orderBy: { timestamp: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        entityType: true,
        timestamp: true,
      },
    }),
  ]);

  const isBlocked = actor.isBanned || activeSanctions > 0;
  const blockReason = actor.banReason ?? (activeSanctions > 0 ? `Tienes ${activeSanctions} sancion(es) activa(s).` : null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfil de usuario</h1>
          <p className="text-muted-foreground text-sm">
            Vista informativa de tu cuenta y tu estado dentro del sistema.
          </p>
        </div>
        <Badge variant={isBlocked ? "destructive" : "admin"}>
          {isBlocked ? "Bloqueado" : "Activo"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold">{actor.name ?? "Sin nombre"}</p>
            <p className="text-sm text-muted-foreground">{actor.email ?? "Sin correo"}</p>
            <p className="text-xs text-muted-foreground">Rol: {actor.role}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Carné</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-lg font-semibold">{actor.cardKey ?? "No asignado"}</p>
            {actor.cardKey ? (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/admin/audit/${encodeURIComponent(actor.cardKey)}`}>
                  Ver mi bitacora por carné
                </Link>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tu cuenta aun no tiene un carné vinculado.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              {isBlocked ? (
                <ShieldAlert className="size-4 text-red-600 dark:text-red-400" />
              ) : (
                <UserCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <p className="font-medium">{isBlocked ? "Bloqueado temporalmente" : "Cuenta habilitada"}</p>
            </div>
            {blockReason ? (
              <p className="text-sm text-muted-foreground">{blockReason}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sin bloqueos ni sanciones activas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Préstamos activos</span>
              <span className="font-semibold">{activeLoans}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Sanciones activas</span>
              <span className="font-semibold">{activeSanctions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ultimo inicio de sesion</span>
              <span className="font-medium">{formatDateTime(actor.lastSignedIn)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay eventos de auditoria para tu usuario.</p>
            ) : (
              <ul className="space-y-2">
                {recentAudit.map((entry) => (
                  <li key={entry.id} className="rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p className="text-sm font-medium">{entry.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.entityType} · {formatDateTime(entry.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
