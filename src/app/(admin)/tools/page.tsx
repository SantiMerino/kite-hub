import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

const CONDITION_LABEL: Record<string, string> = {
  excellent: "Excelente",
  good: "Bueno",
  fair: "Regular",
  poor: "Malo",
};

const CONDITION_VARIANT: Record<string, "returned" | "loan" | "alert" | "overdue"> = {
  excellent: "returned",
  good: "loan",
  fair: "alert",
  poor: "overdue",
};

export default async function ToolsPage() {
  const tools = await prisma.tool.findMany({
    include: { inventory: true },
    orderBy: { toolId: "asc" },
  });

  const byCategory = tools.reduce<Record<string, typeof tools>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Herramientas</h1>
        <p className="text-muted-foreground text-sm">
          Catálogo de herramientas e inventario del laboratorio.
        </p>
      </div>

      {Object.entries(byCategory).map(([category, categoryTools]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="size-4 text-emerald-600" />
              {category}
              <Badge variant="inventory">{categoryTools.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">ID</th>
                    <th className="text-left py-2 pr-4 font-medium">Nombre</th>
                    <th className="text-left py-2 pr-4 font-medium">Ubicación</th>
                    <th className="text-left py-2 pr-4 font-medium">Condición</th>
                    <th className="text-left py-2 pr-4 font-medium">Disponibles</th>
                    <th className="text-left py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTools.map((tool) => (
                    <tr key={tool.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {tool.toolId}
                      </td>
                      <td className="py-2.5 pr-4 font-medium">{tool.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{tool.location}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={CONDITION_VARIANT[tool.condition] ?? "inventory"}>
                          {CONDITION_LABEL[tool.condition] ?? tool.condition}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        {tool.inventory?.availableQuantity ?? 0} /{" "}
                        {tool.inventory?.totalQuantity ?? 1}
                      </td>
                      <td className="py-2.5">
                        {(tool.inventory?.availableQuantity ?? 0) > 0 ? (
                          <Badge variant="inventory">Disponible</Badge>
                        ) : (
                          <Badge variant="loan">Prestada</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {tools.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay herramientas registradas aún.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
