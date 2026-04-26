import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getAllCategories, createCategory } from "@/services/category.service";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET() {
  try {
    await requireRole(["staff", "admin"]);
    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["admin"]);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 422 });
    }
    const category = await createCategory(parsed.data.name, parsed.data.description);
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : "Error al crear categoría.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
