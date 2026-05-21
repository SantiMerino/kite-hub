import { Suspense } from "react";
import ToolsAdminPage from "@admin/tools/ToolsAdminPage";
import { Card, CardContent } from "@/components/ui/card";

function ToolsAdminLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Herramientas</h1>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </div>
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Preparando inventario…</CardContent>
      </Card>
    </div>
  );
}

export default function AdminToolsPage() {
  return (
    <Suspense fallback={<ToolsAdminLoading />}>
      <ToolsAdminPage />
    </Suspense>
  );
}
