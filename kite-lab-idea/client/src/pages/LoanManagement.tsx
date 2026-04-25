import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, Clock, QrCode } from "lucide-react";
import { toast } from "sonner";

export default function LoanManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("scan");
  const [toolQR, setToolQR] = useState("");
  const [studentId, setStudentId] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: tools = [] } = trpc.tools.list.useQuery();

  const handleToolQRChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setToolQR(value);
    
    // Auto-detect if it's a complete tool ID
    if (value.includes("_") && value.length >= 6) {
      // Tool ID detected, move to student ID field
      const studentInput = document.getElementById("studentIdInput") as HTMLInputElement;
      if (studentInput) {
        studentInput.focus();
      }
    }
  };

  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setStudentId(value);
  };

  const handleProcessLoan = async () => {
    if (!toolQR || !studentId) {
      toast.error("Por favor ingresa el ID de la herramienta y el carné del estudiante");
      return;
    }

    const tool = tools.find(t => t.toolId === toolQR);
    if (!tool) {
      toast.error("Herramienta no encontrada");
      setToolQR("");
      return;
    }

    // TODO: Implement loan logic
    toast.success(`Préstamo registrado: ${tool.name} para ${studentId}`);
    setToolQR("");
    setStudentId("");
  };

  const startQRScanner = async () => {
    setScannerActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast.error("No se pudo acceder a la cámara");
      setScannerActive(false);
    }
  };

  const stopQRScanner = () => {
    setScannerActive(false);
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Préstamos</h1>
          <p className="text-slate-600 mt-2">Registra préstamos y devoluciones de herramientas del laboratorio</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="scan" className="gap-2">
              <QrCode size={18} />
              Escanear
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Clock size={18} />
              Entrada Manual
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              <Clock size={18} />
              Préstamos Activos
            </TabsTrigger>
          </TabsList>

          {/* QR Scanner Tab */}
          <TabsContent value="scan">
            <Card>
              <CardHeader>
                <CardTitle>Escanear QR</CardTitle>
                <CardDescription>Escanea el código QR de la herramienta y el carné del estudiante</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!scannerActive ? (
                  <Button onClick={startQRScanner} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
                    <QrCode size={20} />
                    Activar Cámara
                  </Button>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg border-2 border-blue-300"
                      style={{ maxHeight: "400px" }}
                    />
                    <Button onClick={stopQRScanner} variant="destructive" className="w-full">
                      Detener Cámara
                    </Button>
                  </>
                )}

                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="toolQRScan">ID de Herramienta</Label>
                    <Input
                      id="toolQRScan"
                      placeholder="Escanea o ingresa el ID de la herramienta (ej: MAR_001)"
                      value={toolQR}
                      onChange={handleToolQRChange}
                      className="font-mono text-lg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="studentIdScan">Carné del Estudiante</Label>
                    <Input
                      id="studentIdScan"
                      placeholder="Escanea o ingresa el carné del estudiante"
                      value={studentId}
                      onChange={handleStudentIdChange}
                      className="font-mono text-lg"
                    />
                  </div>

                  <Button
                    onClick={handleProcessLoan}
                    disabled={!toolQR || !studentId}
                    className="w-full bg-green-600 hover:bg-green-700 gap-2"
                  >
                    <CheckCircle size={20} />
                    Registrar Préstamo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Entrada Manual</CardTitle>
                <CardDescription>Registra un préstamo ingresando manualmente los datos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="toolManual">ID de Herramienta</Label>
                  <Input
                    id="toolManual"
                    placeholder="Ej: MAR_001"
                    value={toolQR}
                    onChange={handleToolQRChange}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="studentManual">Carné del Estudiante</Label>
                  <Input
                    id="studentManual"
                    placeholder="Ej: EST_2024_001"
                    value={studentId}
                    onChange={handleStudentIdChange}
                    className="font-mono"
                  />
                </div>

                <Button
                  onClick={handleProcessLoan}
                  disabled={!toolQR || !studentId}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Registrar Préstamo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Loans Tab */}
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Préstamos Activos</CardTitle>
                <CardDescription>Lista de herramientas actualmente prestadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* TODO: Implement active loans list */}
                  <div className="text-center py-8 text-slate-500">
                    <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No hay préstamos activos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Reference */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Instrucciones de Uso</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>1. Escanea el código QR de la herramienta ubicado en el estante</p>
            <p>2. Escanea o ingresa el carné del estudiante que solicita el préstamo</p>
            <p>3. El sistema registrará automáticamente la fecha y hora del préstamo</p>
            <p>4. Para devoluciones, escanea nuevamente la herramienta para registrar la devolución</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
