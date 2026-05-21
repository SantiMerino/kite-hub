import { Suspense } from "react";
import SanctionsAdminPage from "@admin/sanctions/SanctionsAdminPage";
import { Card, CardContent } from "@/components/ui/card";

function SanctionsAdminLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sanciones</h1>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </div>
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Preparando vista…</CardContent>
      </Card>
    </div>
  );
}

export default function AdminSanctionsPage() {
  return (
    <Suspense fallback={<SanctionsAdminLoading />}>
      <SanctionsAdminPage />
    </Suspense>
  );
}
