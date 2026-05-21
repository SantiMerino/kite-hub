"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminMetricsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard#metricas");
  }, [router]);

  return (
    <p className="text-sm text-muted-foreground animate-fade-in">Redirigiendo al panel…</p>
  );
}
