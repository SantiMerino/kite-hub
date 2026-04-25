import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, BarChart3, AlertCircle, TrendingUp } from "lucide-react";

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterType, setFilterType] = useState("all");

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Reportes y Análisis</h1>
          <p className="text-slate-600 mt-2">Visualiza estadísticas y bitácora del sistema</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Préstamos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">156</div>
              <p className="text-xs text-slate-500 mt-1">Este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">8</div>
              <p className="text-xs text-slate-500 mt-1">En préstamo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Atrasos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">2</div>
              <p className="text-xs text-slate-500 mt-1">Requieren atención</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Tasa Devolución</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">98.7%</div>
              <p className="text-xs text-slate-500 mt-1">A tiempo</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 size={18} />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText size={18} />
              Bitácora
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <AlertCircle size={18} />
              Alertas
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Herramientas Más Solicitadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Martillo", count: 45, percentage: 28 },
                      { name: "Destornillador", count: 38, percentage: 24 },
                      { name: "Multímetro", count: 32, percentage: 20 },
                      { name: "Alicates", count: 28, percentage: 18 },
                      { name: "Sierra", count: 13, percentage: 10 },
                    ].map((tool) => (
                      <div key={tool.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{tool.name}</span>
                          <span className="text-sm text-slate-600">{tool.count} préstamos</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${tool.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usuarios Más Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "Juan Pérez", loans: 12 },
                      { name: "María García", loans: 10 },
                      { name: "Carlos López", loans: 9 },
                      { name: "Ana Martínez", loans: 8 },
                      { name: "Pedro Rodríguez", loans: 7 },
                    ].map((user) => (
                      <div key={user.name} className="flex justify-between items-center">
                        <span className="text-sm text-slate-700">{user.name}</span>
                        <span className="text-sm font-semibold text-blue-600">{user.loans} préstamos</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Bitácora de Auditoría</CardTitle>
                <CardDescription>Registro completo de todas las operaciones del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dateFrom">Desde</Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateTo">Hasta</Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="filterType">Tipo de Acción</Label>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="borrow">Préstamos</SelectItem>
                          <SelectItem value="return">Devoluciones</SelectItem>
                          <SelectItem value="create">Creaciones</SelectItem>
                          <SelectItem value="update">Actualizaciones</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">Filtrar</Button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {[
                    { action: "BORROW", tool: "Martillo (MAR_001)", user: "Juan Pérez", time: "2024-04-06 14:30" },
                    { action: "RETURN", tool: "Destornillador (DES_002)", user: "María García", time: "2024-04-06 13:45" },
                    { action: "CREATE_TOOL", tool: "Multímetro (MUL_003)", user: "Admin", time: "2024-04-06 10:15" },
                    { action: "BORROW", tool: "Alicates (ALI_004)", user: "Carlos López", time: "2024-04-06 09:20" },
                    { action: "UPDATE_TOOL", tool: "Sierra (SIE_005)", user: "Admin", time: "2024-04-05 16:00" },
                  ].map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {log.action === "BORROW" ? "📤 Préstamo" :
                           log.action === "RETURN" ? "📥 Devolución" :
                           log.action === "CREATE_TOOL" ? "➕ Creación" :
                           "✏️ Actualización"}
                        </p>
                        <p className="text-xs text-slate-600">{log.tool} - {log.user}</p>
                      </div>
                      <span className="text-xs text-slate-500">{log.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Alertas del Sistema</CardTitle>
                <CardDescription>Eventos que requieren atención</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-900">Préstamo en Atraso</p>
                    <p className="text-xs text-red-700 mt-1">Juan Pérez tiene un martillo (MAR_001) 2 días atrasado desde el 04/04/2024</p>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-900">Préstamo en Atraso</p>
                    <p className="text-xs text-red-700 mt-1">María García tiene un destornillador (DES_002) 1 día atrasado desde el 05/04/2024</p>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-900">Próximo a Vencer</p>
                    <p className="text-xs text-yellow-700 mt-1">Carlos López debe devolver alicates (ALI_004) en 1 día</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
