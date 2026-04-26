import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { updateLocation, deleteLocation } from "@/services/location.service";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  locationType: z.enum(["estante", "gaveta"]).optional(),
  area: z.string().min(1).max(100).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });
    }
    const loc = await updateLocation(Number(id), parsed.data);
    return NextResponse.json(loc);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : "Error al actualizar ubicación.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    await deleteLocation(Number(id));
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : "Error al eliminar ubicación.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
