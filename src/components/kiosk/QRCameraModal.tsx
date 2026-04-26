"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";

interface QRCameraModalProps {
  title: string;
  onScan: (result: string) => void;
  onClose: () => void;
}

/** Inverts every RGB pixel on a canvas in-place. */
function invertCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = 255 - data[i];     // R
    data[i + 1] = 255 - data[i + 1]; // G
    data[i + 2] = 255 - data[i + 2]; // B
    // Alpha unchanged
  }
  ctx.putImageData(imageData, 0, 0);
}

export default function QRCameraModal({ title, onScan, onClose }: QRCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const calledRef = useRef(false);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !mounted || video.readyState < video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;

      // ── Pass 1: normal frame ──────────────────────────────────────────────
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const normal = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hit = jsQR(normal.data, normal.width, normal.height, {
        inversionAttempts: "dontInvert",
      });

      if (hit) {
        handleSuccess(hit.data);
        return;
      }

      // ── Pass 2: inverted frame (white-on-dark QR codes, e.g. blue carné) ──
      invertCanvas(canvas);
      const inverted = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hitInv = jsQR(inverted.data, inverted.width, inverted.height, {
        inversionAttempts: "dontInvert",
      });

      if (hitInv) {
        handleSuccess(hitInv.data);
        return;
      }

      rafRef.current = requestAnimationFrame(scanFrame);
    };

    const startCamera = async () => {
      if (!window.isSecureContext) {
        setCameraError(
          "La cámara requiere HTTPS. Si estás en ngrok, abre la URL https:// y acepta la advertencia antes de llegar a /kiosk."
        );
        setLoading(false);
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (mounted) {
          setLoading(false);
          rafRef.current = requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        const lower = msg.toLowerCase();

        if (lower.includes("permission") || lower.includes("notallowed") || lower.includes("denied")) {
          setCameraError("Permiso de cámara denegado. Toca el ícono de cámara en la barra del navegador y permite el acceso.");
        } else if (lower.includes("not found") || lower.includes("no camera") || lower.includes("notfound")) {
          setCameraError("No se encontró una cámara en este dispositivo.");
        } else if (lower.includes("overconstrained") || lower.includes("constraint")) {
          setCameraError("La cámara no soporta la configuración solicitada. Intenta con otro navegador.");
        } else {
          setCameraError(`Error al iniciar la cámara: ${msg}`);
        }
        setLoading(false);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
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
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                className="w-full"
                playsInline
                muted
              />
              {/* Off-screen canvas used only for pixel processing */}
              <canvas ref={canvasRef} className="hidden" />
            </>
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
