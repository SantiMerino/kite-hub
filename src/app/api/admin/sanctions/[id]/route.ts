import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { deleteSanction, updateSanction } from "@/services/sanction.service";

const updateSchema = z.object({
  status: z.enum(["active", "resolved", "appealed"]).optional(),
  description: z.string().optional(),
  daysOverdue: z.number().int().min(0).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isPermanent: z.boolean().optional(),
  appealMessage: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["staff", "admin"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 422 });
    }

    const sanction = await updateSanction(Number(id), actor.id, parsed.data);
    return NextResponse.json(sanction);
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await params;
    await deleteSanction(Number(id), actor.id);
    return NextResponse.json({ success: true });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
