import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { patchCategory, deleteCategory } from "@/services/category.service";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const patchSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    color: hexColor.nullable().optional(),
  })
  .refine((d) => d.name !== undefined || d.description !== undefined || d.color !== undefined, {
    message: "Sin cambios",
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
    const cat = await patchCategory(Number(id), parsed.data);
    return NextResponse.json(cat);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : "Error al actualizar categoría.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    await deleteCategory(Number(id));
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : "Error al eliminar categoría.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
