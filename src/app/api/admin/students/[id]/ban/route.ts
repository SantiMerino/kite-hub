import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  isBanned: z.boolean(),
  banReason: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 422 });

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        isBanned: parsed.data.isBanned,
        banReason: parsed.data.isBanned ? (parsed.data.banReason ?? "Bloqueado por administrador") : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: parsed.data.isBanned ? "BAN_STUDENT" : "UNBAN_STUDENT",
        entityType: "USER",
        entityId: Number(id),
        userId: actor.id,
        details: JSON.stringify(parsed.data),
      },
    });

    return NextResponse.json(user);
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
