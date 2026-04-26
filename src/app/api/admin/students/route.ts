import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  cardKey: z.string().regex(/^KEY_\d{6}$/, "Formato KEY_XXXXXX requerido"),
});

export async function GET() {
  try {
    await requireRole(["staff", "admin"]);
    const students = await prisma.user.findMany({
      where: { role: "student" },
      include: {
        loans: {
          where: { status: { in: ["active", "overdue"] } },
          select: { id: true, status: true },
        },
        sanctions: { where: { status: "active" }, select: { id: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(students);
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
      return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 422 });
    }
    const student = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email ?? null,
        cardKey: parsed.data.cardKey.toUpperCase(),
        role: "student",
      },
    });
    return NextResponse.json(student, { status: 201 });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
