import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { updateTool, deleteTool } from "@/services/tool.service";

const CONDITION_VALUES = ["excellent", "good", "fair", "poor"] as const;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  condition: z.enum(CONDITION_VALUES).optional(),
  location: z.string().optional(),
  qrCode: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 422 });
    }
    const tool = await updateTool(Number(id), parsed.data, actor.id);
    return NextResponse.json(tool);
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await params;
    await deleteTool(Number(id), actor.id);
    return NextResponse.json({ success: true });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
