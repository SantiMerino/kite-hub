import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function SanctionsManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("active");

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">No tienes permiso para acceder a esta página</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mockSanctions = [
    {
      id: 1,
      student: "Juan Pérez",
      studentId: "EST_2024_001",
      type: "overdue",
      daysOverdue: 2,
      description: "Atraso leve: 1-2 días. Se permite continuar prestando.",
      status: "active",
      createdAt: "2024-04-04",
      tool: "Martillo (MAR_001)",
    },
    {
      id: 2,
      student: "María García",
      studentId: "EST_2024_002",
      type: "overdue",
      daysOverdue: 1,
      description: "Atraso leve: 1-2 días. Se permite continuar prestando.",
      status: "active",
      createdAt: "2024-04-05",
      tool: "Destornillador (DES_002)",
    },
    {
      id: 3,
      student: "Carlos López",
      studentId: "EST_2024_003",
      type: "damage",
      daysOverdue: 0,
      description: "Daño en herramienta. Requiere reparación.",
      status: "active",
      createdAt: "2024-04-03",
      tool: "Multímetro (MUL_003)",
    },
  ];

  const mockRules = [
    {
      id: 1,
      minDays: 1,
      maxDays: 2,
      description: "Atraso leve: 1-2 días. Se permite continuar prestando.",
      canBorrow: true,
    },
    {
      id: 2,
      minDays: 3,
      maxDays: 5,
      description: "Atraso moderado: 3-5 días. Restricción temporal de préstamos.",
      canBorrow: false,
    },
    {
      id: 3,
      minDays: 6,
      maxDays: 10,
      description: "Atraso severo: 6-10 días. Prohibición de préstamos por 1 semana.",
      canBorrow: false,
    },
    {
      id: 4,
      minDays: 11,
      maxDays: null,
      description: "Atraso crítico: +11 días. Prohibición de préstamos hasta resolución.",
      canBorrow: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Sanciones</h1>
          <p className="text-slate-600 mt-2">Administra sanciones y reglas de atraso</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="active" className="gap-2">
              <AlertCircle size={18} />
              Activas
            </TabsTrigger>
            <TabsTrigger value="resolved" className="gap-2">
              <CheckCircle size={18} />
              Resueltas
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Clock size={18} />
              Reglas
            </TabsTrigger>
          </TabsList>

          {/* Active Sanctions */}
          <TabsContent value="active">
            <div className="space-y-4">
              {mockSanctions
                .filter(s => s.status === "active")
                .map(sanction => (
                  <Card key={sanction.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">{sanction.student}</h3>
                          <p className="text-sm text-slate-600">{sanction.studentId}</p>
                        </div>
                        <Badge
                          className={
                            sanction.daysOverdue <= 2
                              ? "bg-yellow-100 text-yellow-800"
                              : sanction.daysOverdue <= 5
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {sanction.daysOverdue} días de atraso
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-sm">
                          <span className="font-semibold">Herramienta:</span> {sanction.tool}
                        </p>
                        <p className="text-sm">
                          <span className="font-semibold">Descripción:</span> {sanction.description}
                        </p>
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold">Desde:</span> {sanction.createdAt}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          Contactar Estudiante
                        </Button>
                        <Button variant="default" size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                          Resolver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* Resolved Sanctions */}
          <TabsContent value="resolved">
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-slate-600">No hay sanciones resueltas recientemente</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules */}
          <TabsContent value="rules">
            <div className="space-y-4">
              {mockRules.map(rule => (
                <Card key={rule.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {rule.minDays}-{rule.maxDays ? `${rule.maxDays} días` : "+ días"}
                        </h3>
                        <p className="text-sm text-slate-600">{rule.description}</p>
                      </div>
                      <Badge className={rule.canBorrow ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {rule.canBorrow ? "Puede Prestar" : "Prohibido Prestar"}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1">
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
                + Agregar Nueva Regla
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
