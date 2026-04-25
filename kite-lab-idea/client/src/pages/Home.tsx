import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { BarChart3, Users, Wrench, AlertCircle, QrCode, FileText } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
        {/* Navigation */}
        <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wrench className="text-blue-600" size={28} />
              <span className="text-xl font-bold text-slate-900">KITE Lab System</span>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold text-slate-900 mb-6">
                Sistema de Gestión de Préstamos
              </h1>
              <p className="text-xl text-slate-600 mb-8">
                Administra el inventario de herramientas del laboratorio KITE de forma eficiente y segura. Escanea QR, registra préstamos y mantén un control total.
              </p>
              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  onClick={() => window.location.href = "/api/oauth/login"}
                >
                  Iniciar Sesión
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="pt-6">
                  <QrCode className="text-blue-600 mb-4" size={32} />
                  <h3 className="font-semibold text-slate-900">Escaneo QR</h3>
                  <p className="text-sm text-slate-600">Registra préstamos al instante</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="pt-6">
                  <Wrench className="text-green-600 mb-4" size={32} />
                  <h3 className="font-semibold text-slate-900">Inventario</h3>
                  <p className="text-sm text-slate-600">Control completo de herramientas</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="pt-6">
                  <AlertCircle className="text-purple-600 mb-4" size={32} />
                  <h3 className="font-semibold text-slate-900">Alertas</h3>
                  <p className="text-sm text-slate-600">Notificaciones de atrasos</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="pt-6">
                  <FileText className="text-orange-600 mb-4" size={32} />
                  <h3 className="font-semibold text-slate-900">Reportes</h3>
                  <p className="text-sm text-slate-600">Historial y auditoría</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white border-t border-slate-200 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Características Principales</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Users className="text-blue-600 mb-2" size={28} />
                  <CardTitle>Autenticación por Roles</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Acceso diferenciado para estudiantes y encargados del laboratorio</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <QrCode className="text-green-600 mb-2" size={28} />
                  <CardTitle>Escaneo QR Rápido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Registra préstamos y devoluciones en segundos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <AlertCircle className="text-red-600 mb-2" size={28} />
                  <CardTitle>Alertas Automáticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Notificaciones de atrasos y sanciones configurables</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="text-purple-600 mb-2" size={28} />
                  <CardTitle>Reportes Detallados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Historial completo de préstamos y auditoría</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Wrench className="text-orange-600 mb-2" size={28} />
                  <CardTitle>Gestión de Inventario</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">CRUD completo de herramientas y categorías</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <FileText className="text-cyan-600 mb-2" size={28} />
                  <CardTitle>Bitácora de Auditoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Registro completo de todas las operaciones</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-slate-400">KITE Lab System © 2024 - Sistema de Gestión de Préstamos</p>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wrench className="text-blue-600" size={28} />
            <span className="text-xl font-bold text-slate-900">KITE Lab System</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">Bienvenido, {user?.name}</span>
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {user?.role === "admin" ? (
          <>
            {/* Admin Dashboard */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Panel de Control - Encargado</h1>
              <p className="text-slate-600 mt-2">Administra el laboratorio KITE</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Herramientas Activas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">24</div>
                  <p className="text-xs text-slate-500 mt-1">Disponibles en el laboratorio</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Préstamos Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">8</div>
                  <p className="text-xs text-slate-500 mt-1">Herramientas prestadas</p>
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
                  <CardTitle className="text-sm font-medium text-slate-600">Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">156</div>
                  <p className="text-xs text-slate-500 mt-1">Estudiantes registrados</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => setLocation("/tools")}
                    className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Wrench size={18} />
                    Gestionar Herramientas
                  </Button>
                  <Button
                    onClick={() => setLocation("/loans")}
                    className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <QrCode size={18} />
                    Registrar Préstamo
                  </Button>
                  <Button
                    onClick={() => setLocation("/reports")}
                    className="w-full justify-start gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    <FileText size={18} />
                    Ver Reportes
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Información del Sistema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><span className="font-semibold">Rol:</span> Administrador</p>
                  <p><span className="font-semibold">Email:</span> {user?.email}</p>
                  <p><span className="font-semibold">Última sesión:</span> Hoy</p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            {/* Student Dashboard */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Mi Panel - Estudiante</h1>
              <p className="text-slate-600 mt-2">Gestiona tus préstamos de herramientas</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Mis Préstamos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">2</div>
                  <p className="text-xs text-slate-500 mt-1">Herramientas activas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Sanciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">0</div>
                  <p className="text-xs text-slate-500 mt-1">Ninguna activa</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Historial</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">12</div>
                  <p className="text-xs text-slate-500 mt-1">Préstamos realizados</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Acciones Disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setLocation("/loans")}
                  className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <QrCode size={18} />
                  Solicitar Préstamo
                </Button>
                <Button
                  onClick={() => setLocation("/my-loans")}
                  className="w-full justify-start gap-2 bg-slate-600 hover:bg-slate-700"
                >
                  <FileText size={18} />
                  Ver Mis Préstamos
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
