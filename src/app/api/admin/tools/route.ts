import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getAllTools, createTool } from "@/services/tool.service";

const CONDITION_VALUES = ["excellent", "good", "fair", "poor"] as const;

const createSchema = z.object({
  toolId: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().min(1),
  condition: z.enum(CONDITION_VALUES).optional(),
  location: z.string().min(1),
  qrCode: z.string().optional(),
});

export async function GET() {
  try {
    const actor = await requireRole(["staff", "admin"]);
    void actor;
    const tools = await getAllTools();
    return NextResponse.json(tools);
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole(["admin"]);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 422 });
    }
    const tool = await createTool(parsed.data, actor.id);
    return NextResponse.json(tool, { status: 201 });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
