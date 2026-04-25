import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export default function ToolsManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: tools = [], isLoading, refetch } = trpc.tools.list.useQuery();
  const createMutation = trpc.tools.create.useMutation();
  const updateMutation = trpc.tools.update.useMutation();
  const deleteMutation = trpc.tools.delete.useMutation();

  const [formData, setFormData] = useState({
    toolId: "",
    name: "",
    description: "",
    category: "",
    condition: "good" as const,
    location: "",
    qrCode: "",
  });

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

  const handleCreateTool = async () => {
    if (!formData.toolId || !formData.name || !formData.category || !formData.location) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      toast.success("Herramienta creada exitosamente");
      setFormData({
        toolId: "",
        name: "",
        description: "",
        category: "",
        condition: "good",
        location: "",
        qrCode: "",
      });
      setIsCreateOpen(false);
      refetch();
    } catch (error) {
      toast.error("Error al crear la herramienta");
    }
  };

  const handleDeleteTool = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta herramienta?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Herramienta eliminada exitosamente");
        refetch();
      } catch (error) {
        toast.error("Error al eliminar la herramienta");
      }
    }
  };

  const filteredTools = tools.filter(
    (tool) =>
      tool.toolId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestión de Herramientas</h1>
            <p className="text-slate-600 mt-2">Administra el inventario de herramientas del laboratorio KITE</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus size={20} />
                Nueva Herramienta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nueva Herramienta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="toolId">ID de Herramienta *</Label>
                    <Input
                      id="toolId"
                      placeholder="e.g., MAR_001"
                      value={formData.toolId}
                      onChange={(e) => setFormData({ ...formData, toolId: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Martillo"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Categoría *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Herramientas Manuales">Herramientas Manuales</SelectItem>
                        <SelectItem value="Equipos Electrónicos">Equipos Electrónicos</SelectItem>
                        <SelectItem value="Medición">Equipos de Medición</SelectItem>
                        <SelectItem value="Seguridad">Equipos de Seguridad</SelectItem>
                        <SelectItem value="Otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location">Ubicación *</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Estante A-1"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition">Condición</Label>
                    <Select value={formData.condition} onValueChange={(value: any) => setFormData({ ...formData, condition: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excelente</SelectItem>
                        <SelectItem value="good">Buena</SelectItem>
                        <SelectItem value="fair">Regular</SelectItem>
                        <SelectItem value="poor">Mala</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Descripción detallada de la herramienta"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <Button onClick={handleCreateTool} className="w-full bg-blue-600 hover:bg-blue-700">
                  Crear Herramienta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <Input
              placeholder="Buscar por ID, nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tools Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTools.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-slate-600">No hay herramientas registradas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => (
              <Card key={tool.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <CardDescription className="text-sm font-mono">{tool.toolId}</CardDescription>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      tool.condition === "excellent" ? "bg-green-100 text-green-800" :
                      tool.condition === "good" ? "bg-blue-100 text-blue-800" :
                      tool.condition === "fair" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {tool.condition === "excellent" ? "Excelente" :
                       tool.condition === "good" ? "Buena" :
                       tool.condition === "fair" ? "Regular" : "Mala"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm"><span className="font-semibold">Categoría:</span> {tool.category}</p>
                    <p className="text-sm"><span className="font-semibold">Ubicación:</span> {tool.location}</p>
                    {tool.description && <p className="text-sm text-slate-600">{tool.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1">
                      <Edit2 size={16} />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => handleDeleteTool(tool.id)}
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
