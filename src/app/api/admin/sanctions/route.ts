import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  studentId: z.number(),
  loanId: z.number().optional(),
  sanctionType: z.enum(["overdue", "damage", "loss", "other"]),
  daysOverdue: z.number().default(0),
  description: z.string().optional(),
});

export async function GET() {
  try {
    await requireRole(["staff", "admin"]);
    const sanctions = await prisma.sanction.findMany({
      include: {
        student: { select: { id: true, name: true, cardKey: true } },
        loan: { include: { tool: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sanctions);
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole(["staff", "admin"]);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 422 });

    const sanction = await prisma.sanction.create({ data: parsed.data });

    await prisma.auditLog.create({
      data: {
        action: "CREATE_SANCTION",
        entityType: "SANCTION",
        entityId: sanction.id,
        userId: actor.id,
        details: JSON.stringify(parsed.data),
      },
    });

    return NextResponse.json(sanction, { status: 201 });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
