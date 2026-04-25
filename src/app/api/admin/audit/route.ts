import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["staff", "admin"]);

    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get("page") ?? 1);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
    const userId = searchParams.get("userId");
    const toolId = searchParams.get("toolId");
    const action = searchParams.get("action");

    const where: Record<string, unknown> = {};
    if (userId) where.userId = Number(userId);
    if (toolId) where.toolId = Number(toolId);
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, cardKey: true } },
          tool: { select: { id: true, toolId: true, name: true } },
        },
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
