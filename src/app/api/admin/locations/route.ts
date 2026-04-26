import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getAllLocations, createLocation } from "@/services/location.service";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  locationType: z.enum(["estante", "gaveta"]).default("estante"),
  area: z.string().min(1).max(100),
});

export async function GET() {
  try {
    await requireRole(["staff", "admin"]);
    const locations = await getAllLocations();
    return NextResponse.json(locations);
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
    const location = await createLocation(parsed.data);
    return NextResponse.json(location, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : "Error al crear ubicación.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
