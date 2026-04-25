"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRCameraModalProps {
  title: string;
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRCameraModal({ title, onScan, onClose }: QRCameraModalProps) {
  const readerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<unknown>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const calledRef = useRef(false);

  const handleSuccess = useCallback(
    (decodedText: string) => {
      if (calledRef.current) return;
      calledRef.current = true;
      onScan(decodedText);
    },
    [onScan]
  );

  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (!readerRef.current || !mounted) return;

        const scanner = new Html5Qrcode("kite-qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (mounted) handleSuccess(decodedText);
          },
          undefined
        );

        setLoading(false);
      } catch (err) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.toLowerCase().includes("permission")) {
            setCameraError("Permiso de cámara denegado. Actívalo en la configuración del navegador.");
          } else if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no camera")) {
            setCameraError("No se encontró una cámara disponible en este dispositivo.");
          } else {
            setCameraError(`Error al iniciar la cámara: ${msg}`);
          }
          setLoading(false);
        }
      }
    };

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        const scanner = scannerRef.current as { stop: () => Promise<void>; clear: () => void };
        scanner.stop().catch(() => {}).finally(() => scanner.clear());
      }
    };
  }, [handleSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">{title}</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Camera area */}
        <div className="relative bg-black" style={{ minHeight: 300 }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              <span className="animate-pulse">Iniciando cámara…</span>
            </div>
          )}

          {cameraError ? (
            <div className="p-6 flex flex-col items-center gap-3 text-center">
              <CameraOff className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{cameraError}</p>
            </div>
          ) : (
            <div id="kite-qr-reader" ref={readerRef} className="w-full" />
          )}

          {/* Scan guide overlay */}
          {!cameraError && !loading && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="size-48 border-2 border-white/70 rounded-lg" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Centra el código QR dentro del recuadro
          </p>
          <Button variant="outline" className="mt-2 w-full" onClick={onClose} size="sm">
            Cancelar — ingresar manualmente
          </Button>
        </div>
      </div>
    </div>
  );
}
